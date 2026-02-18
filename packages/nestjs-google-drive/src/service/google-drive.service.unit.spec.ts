import { Readable } from 'stream';
import { GoogleDriveService } from './google-drive.service';

describe('GoogleDriveService', () => {
  const DRIVE_ROOT = 'drive-root-id';

  const makeService = () => {
    const service = new GoogleDriveService();
    const get = jest.fn();
    const list = jest.fn();
    const create = jest.fn();
    const update = jest.fn();
    const exportFn = jest.fn();
    const del = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).driveClient = {
      files: {
        get,
        list,
        create,
        update,
        export: exportFn,
        delete: del,
      },
    };

    return { service, get, list, create, update, exportFn, del };
  };

  /**
   * Helper: configure `list` mock to simulate the Google Drive API.
   *
   * _listFolders (folderKey='') queries with
   *   `trashed = false and  mimeType='application/vnd.google-apps.folder'`
   * and rebuilds full paths via buildFullPath using `parents`.
   * A folder whose parent ID is NOT in the result list gets parentPath='/',
   * so its full path becomes `/<name>`.
   *
   * _listFilesInFolder(folderId) queries with
   *   `trashed = false and '<folderId>' in parents`
   * (no mimeType filter).
   *
   * Root-level folders MUST have `parents: [DRIVE_ROOT]` (an ID absent from
   * the folder list) so that buildFullPath produces `/<name>` instead of `/`.
   */
  const mockFolderStructure = (
    list: jest.Mock,
    folders: { name: string; id: string; parentId?: string }[],
    files: { name: string; id: string; mimeType: string; size: string; parentId: string }[],
  ) => {
    list.mockImplementation(({ q }: { q: string }) => {
      const isFolderQuery = q.includes("mimeType='application/vnd.google-apps.folder'");
      if (isFolderQuery) {
        return Promise.resolve({
          data: {
            files: folders.map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [f.parentId ?? DRIVE_ROOT],
            })),
            nextPageToken: '',
          },
        });
      }
      const parentMatch = q.match(/'([^']+)' in parents/);
      const parentId = parentMatch?.[1] ?? '';
      const matchingFiles = files.filter((f) => f.parentId === parentId);
      const matchingSubFolders = folders.filter((f) => (f.parentId ?? DRIVE_ROOT) === parentId);
      return Promise.resolve({
        data: {
          files: [
            ...matchingFiles.map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              size: f.size,
              parents: [f.parentId],
            })),
            ...matchingSubFolders.map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: 'application/vnd.google-apps.folder',
              size: '0',
              parents: [f.parentId ?? DRIVE_ROOT],
            })),
          ],
          nextPageToken: '',
        },
      });
    });
  };

  describe('setConnection', () => {
    it('initializes drive client with provided credentials', () => {
      const service = new GoogleDriveService();

      service.setConnection('client@example.com', 'private-key-content');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).driveClient).toBeDefined();
    });
  });

  describe('getStream', () => {
    it('returns response data as readable', async () => {
      const { service, get } = makeService();
      const stream = Readable.from(['chunk']);

      get.mockResolvedValue({ data: stream });

      await expect(service.getStream('file-id')).resolves.toBe(stream);
    });

    it('remaps provider errors', async () => {
      const { service, get } = makeService();
      get.mockRejectedValue({ response: { status: 429 }, errors: [{ reason: 'userRateLimitExceeded' }] });

      await expect(service.getStream('file-id')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'getStream',
        category: 'rate_limit',
      });
    });
  });

  describe('download', () => {
    it('exports spreadsheet files as csv bytes', async () => {
      const { service, get, exportFn } = makeService();
      const csvData = new Uint8Array([65, 66, 67]).buffer;

      get.mockResolvedValueOnce({ data: { mimeType: 'application/vnd.google-apps.spreadsheet' } });
      exportFn.mockResolvedValueOnce({ data: csvData });

      await expect(service.download('sheet-id')).resolves.toEqual(new Uint8Array(csvData));
      expect(exportFn).toHaveBeenCalledWith(
        {
          fileId: 'sheet-id',
          mimeType: 'text/csv',
        },
        { responseType: 'arraybuffer' },
      );
    });

    it('returns raw file bytes for non-spreadsheet mime types', async () => {
      const { service, get } = makeService();
      const fileData = new Uint8Array([1, 2, 3]).buffer;

      get.mockResolvedValueOnce({ data: { mimeType: 'text/plain' } });
      get.mockResolvedValueOnce({ data: fileData });

      await expect(service.download('file-id')).resolves.toEqual(new Uint8Array(fileData));
      expect(get).toHaveBeenLastCalledWith(
        {
          fileId: 'file-id',
          alt: 'media',
        },
        { responseType: 'arraybuffer' },
      );
    });

    it('remaps download errors', async () => {
      const { service, get } = makeService();
      get.mockRejectedValue({ response: { status: 404 } });

      await expect(service.download('missing-id')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'download',
        category: 'not_found',
      });
    });
  });

  describe('getLink', () => {
    it('returns web view link', async () => {
      const { service, get } = makeService();
      get.mockResolvedValue({ data: { webViewLink: 'https://drive.google.com/file/d/abc' } });

      await expect(service.getLink('abc')).resolves.toBe('https://drive.google.com/file/d/abc');
    });

    it('remaps getLink errors', async () => {
      const { service, get } = makeService();
      get.mockRejectedValue({ response: { status: 403 } });

      await expect(service.getLink('forbidden-id')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'getLink',
        category: 'permission',
      });
    });

    it('throws when webViewLink is missing', async () => {
      const { service, get } = makeService();
      get.mockResolvedValue({ data: { webViewLink: null } });

      await expect(service.getLink('file-id')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'getLink',
      });
    });
  });

  describe('delete', () => {
    it('deletes a file successfully', async () => {
      const { service, del } = makeService();
      del.mockResolvedValue({});

      await expect(service.delete('abc')).resolves.toBeUndefined();
      expect(del).toHaveBeenCalledWith({ fileId: 'abc' });
    });

    it('remaps provider errors', async () => {
      const { service, del } = makeService();
      del.mockRejectedValue({ response: { status: 403 } });

      await expect(service.delete('abc')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'delete',
        category: 'permission',
      });
    });
  });

  describe('exists', () => {
    it('returns false when file path does not match any folder prefix', async () => {
      const { service, list } = makeService();
      mockFolderStructure(
        list,
        [{ name: 'docs', id: 'folder-docs' }],
        [{ name: 'readme.txt', id: 'file-1', mimeType: 'text/plain', size: '100', parentId: 'folder-docs' }],
      );

      await expect(service.exists('/docs/readme.txt')).resolves.toBe(false);
    });

    it('returns false when folder has no files', async () => {
      const { service, list } = makeService();
      mockFolderStructure(list, [{ name: 'docs', id: 'folder-docs' }], []);

      await expect(service.exists('/docs/missing.txt')).resolves.toBe(false);
    });

    it('returns false when underlying list fails with not found', async () => {
      const { service, list } = makeService();
      list.mockRejectedValue({ response: { status: 404 } });

      await expect(service.exists('/missing')).resolves.toBe(false);
    });

    it('rethrows mapped errors for non-not-found failures', async () => {
      const { service, list } = makeService();
      list.mockRejectedValue({ response: { status: 403 } });

      await expect(service.exists('/forbidden')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'listFiles',
        category: 'permission',
      });
    });

    it('normalizes key without leading slash', async () => {
      const { service, list } = makeService();
      mockFolderStructure(list, [], []);

      await expect(service.exists('docs/file.txt')).resolves.toBe(false);
      expect(list).toHaveBeenCalled();
    });
  });

  describe('listFiles', () => {
    it('returns deterministic sorted output', async () => {
      const { service, list } = makeService();
      mockFolderStructure(
        list,
        [{ name: 'base', id: 'folderA' }],
        [
          { name: 'z.txt', id: '2', mimeType: 'text/plain', size: '2', parentId: 'folderA' },
          { name: 'a.txt', id: '1', mimeType: 'text/plain', size: '1', parentId: 'folderA' },
        ],
      );

      await expect(service.listFiles('/base')).resolves.toEqual([
        { name: 'base/a.txt', size: 1, key: '1' },
        { name: 'base/z.txt', size: 2, key: '2' },
      ]);
    });

    it('normalizes path without leading slash', async () => {
      const { service, list } = makeService();
      mockFolderStructure(
        list,
        [{ name: 'data', id: 'folder-data' }],
        [{ name: 'file.csv', id: 'f1', mimeType: 'text/csv', size: '50', parentId: 'folder-data' }],
      );

      await expect(service.listFiles('data')).resolves.toEqual([{ name: 'data/file.csv', size: 50, key: 'f1' }]);
    });

    it('appends trailing slash for folder entries', async () => {
      const { service, list } = makeService();
      mockFolderStructure(
        list,
        [
          { name: 'root', id: 'folder-root' },
          { name: 'sub', id: 'folder-sub', parentId: 'folder-root' },
        ],
        [],
      );

      const result = await service.listFiles('/root');
      const subFolder = result.find((f) => f.name.includes('sub'));
      expect(subFolder).toBeDefined();
      expect(subFolder!.name).toMatch(/\/$/);
    });

    it('remaps listFiles errors', async () => {
      const { service, list } = makeService();
      list.mockRejectedValue({ response: { status: 500 } });

      await expect(service.listFiles('/path')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'listFiles',
        category: 'unavailable',
      });
    });

    it('handles pagination in folder listing', async () => {
      const { service, list } = makeService();
      let folderCallCount = 0;
      list.mockImplementation(({ q }: { q: string }) => {
        if (q.includes("mimeType='application/vnd.google-apps.folder'")) {
          folderCallCount++;
          if (folderCallCount === 1) {
            return Promise.resolve({
              data: {
                files: [
                  { id: 'f1', name: 'page1', mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_ROOT] },
                ],
                nextPageToken: 'token-2',
              },
            });
          }
          return Promise.resolve({
            data: {
              files: [],
              nextPageToken: '',
            },
          });
        }
        return Promise.resolve({ data: { files: [], nextPageToken: '' } });
      });

      const result = await service.listFiles('/page1');
      expect(folderCallCount).toBe(2);
      expect(result).toBeDefined();
    });

    it('handles pagination in file listing within folder', async () => {
      const { service, list } = makeService();
      let fileCallCount = 0;
      list.mockImplementation(({ q }: { q: string }) => {
        if (q.includes("mimeType='application/vnd.google-apps.folder'")) {
          return Promise.resolve({
            data: {
              files: [
                { id: 'folder-a', name: 'docs', mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_ROOT] },
              ],
              nextPageToken: '',
            },
          });
        }
        fileCallCount++;
        if (fileCallCount === 1) {
          return Promise.resolve({
            data: {
              files: [{ id: 'f1', name: 'a.txt', mimeType: 'text/plain', size: '1', parents: ['folder-a'] }],
              nextPageToken: 'page-2',
            },
          });
        }
        return Promise.resolve({
          data: {
            files: [{ id: 'f2', name: 'b.txt', mimeType: 'text/plain', size: '2', parents: ['folder-a'] }],
            nextPageToken: '',
          },
        });
      });

      const result = await service.listFiles('/docs');
      expect(fileCallCount).toBe(2);
      expect(result).toEqual([
        { name: 'docs/a.txt', size: 1, key: 'f1' },
        { name: 'docs/b.txt', size: 2, key: 'f2' },
      ]);
    });

    it('handles folders with no matching path', async () => {
      const { service, list } = makeService();
      mockFolderStructure(list, [{ name: 'other', id: 'folder-other' }], []);

      const result = await service.listFiles('/nonexistent');
      expect(result).toEqual([]);
    });

    it('returns empty list when no folders exist', async () => {
      const { service, list } = makeService();
      mockFolderStructure(list, [], []);

      const result = await service.listFiles('/unknown');
      expect(result).toEqual([]);
    });
  });

  describe('uploadFile', () => {
    it('creates a new file when key does not exist', async () => {
      const { service, list, create } = makeService();
      mockFolderStructure(list, [{ name: 'path', id: 'folder-path' }], []);
      create.mockResolvedValue({ data: { id: 'created-id' } });

      const result = await service.uploadFile('/path/new.txt', Buffer.from('hello'), 'text/plain');

      expect(result).toMatchObject({ id: 'created-id', key: 'path/new.txt' });
      expect(create).toHaveBeenCalled();
    });

    it('updates existing file when key already exists', async () => {
      const { service, list, update } = makeService();
      mockFolderStructure(
        list,
        [{ name: 'path', id: 'folder-path' }],
        [{ name: 'existing.txt', id: 'file-id', mimeType: 'text/plain', size: '12', parentId: 'folder-path' }],
      );
      update.mockResolvedValue({ data: { id: 'updated-id' } });

      const result = await service.uploadFile('/path/existing.txt', Buffer.from('hello'), 'text/plain');

      expect(result).toMatchObject({ id: 'updated-id', key: 'path/existing.txt' });
      expect(update).toHaveBeenCalledWith({
        fileId: 'file-id',
        media: {
          mimeType: 'text/plain',
          body: expect.any(Readable),
        },
      });
    });

    it('creates public file with permissions', async () => {
      const { service, list, create } = makeService();
      mockFolderStructure(list, [{ name: 'public', id: 'folder-public' }], []);
      create.mockResolvedValue({ data: { id: 'public-file-id' } });

      const result = await service.uploadFile('/public/file.txt', Buffer.from('data'), 'text/plain', true);

      expect(result).toMatchObject({
        id: 'public-file-id',
        key: 'public/file.txt',
        publicUrl: 'https://drive.google.com/file/d/public-file-id',
      });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            permissions: [{ role: 'reader', type: 'anyone', allowFileDiscovery: false }],
          }),
        }),
      );
    });

    it('returns publicUrl when updating existing file with isPublic', async () => {
      const { service, list, update } = makeService();
      mockFolderStructure(
        list,
        [{ name: 'pub', id: 'folder-pub' }],
        [{ name: 'doc.txt', id: 'existing-id', mimeType: 'text/plain', size: '5', parentId: 'folder-pub' }],
      );
      update.mockResolvedValue({ data: { id: 'existing-id' } });

      const result = await service.uploadFile('/pub/doc.txt', Buffer.from('data'), 'text/plain', true);

      expect(result.publicUrl).toBe('https://drive.google.com/file/d/existing-id');
    });

    it('returns null publicUrl for private upload', async () => {
      const { service, list, create } = makeService();
      mockFolderStructure(list, [{ name: 'priv', id: 'folder-priv' }], []);
      create.mockResolvedValue({ data: { id: 'priv-id' } });

      const result = await service.uploadFile('/priv/file.txt', Buffer.from('data'), 'text/plain', false);

      expect(result.publicUrl).toBeNull();
    });

    it('remaps upload errors', async () => {
      const { service, list } = makeService();
      list.mockRejectedValue({ response: { status: 500 } });

      await expect(service.uploadFile('/path/file.txt', Buffer.from('data'), 'text/plain')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'uploadFile',
      });
    });

    it('creates missing folders before upload', async () => {
      const { service, list, create } = makeService();

      list.mockImplementation(() => {
        return Promise.resolve({ data: { files: [], nextPageToken: '' } });
      });

      create.mockResolvedValue({ data: { id: 'new-id' } });

      const result = await service.uploadFile('/newdir/file.txt', Buffer.from('data'), 'text/plain');
      expect(result).toBeDefined();
      expect(create).toHaveBeenCalled();
    });

    it('normalizes key without leading slash', async () => {
      const { service, list, create } = makeService();
      mockFolderStructure(list, [{ name: 'dir', id: 'folder-dir' }], []);
      create.mockResolvedValue({ data: { id: 'new-id' } });

      const result = await service.uploadFile('dir/file.txt', Buffer.from('data'), 'text/plain');

      expect(result.key).toBe('dir/file.txt');
    });

    it('handles null id in create response', async () => {
      const { service, list, create } = makeService();
      mockFolderStructure(list, [{ name: 'dir', id: 'folder-dir' }], []);
      create.mockResolvedValue({ data: { id: null } });

      const result = await service.uploadFile('/dir/file.txt', Buffer.from('data'), 'text/plain');

      expect(result.id).toBe('');
    });

    it('handles null id in update response', async () => {
      const { service, list, update } = makeService();
      mockFolderStructure(
        list,
        [{ name: 'dir', id: 'folder-dir' }],
        [{ name: 'file.txt', id: 'fid', mimeType: 'text/plain', size: '1', parentId: 'folder-dir' }],
      );
      update.mockResolvedValue({ data: { id: null } });

      const result = await service.uploadFile('/dir/file.txt', Buffer.from('data'), 'text/plain');

      expect(result.id).toBe('');
    });
  });

  describe('uploadPublicFile', () => {
    it('delegates to uploadFile with public flag', async () => {
      const service = new GoogleDriveService();
      const mockResult = { id: 'file-id', key: 'public/file.txt', publicUrl: null };
      const uploadSpy = jest.spyOn(service, 'uploadFile').mockResolvedValue(mockResult);

      await service.uploadPublicFile('/public/file.txt', Buffer.from('data'), 'text/plain');

      expect(uploadSpy).toHaveBeenCalledWith('/public/file.txt', expect.any(Buffer), 'text/plain', true);
    });
  });

  describe('uploadPrivateFile', () => {
    it('delegates to uploadFile with private flag', async () => {
      const service = new GoogleDriveService();
      const mockResult = { id: 'file-id', key: 'private/file.txt', publicUrl: null };
      const uploadSpy = jest.spyOn(service, 'uploadFile').mockResolvedValue(mockResult);

      await service.uploadPrivateFile('/private/file.txt', Buffer.from('data'), 'text/plain');

      expect(uploadSpy).toHaveBeenCalledWith('/private/file.txt', expect.any(Buffer), 'text/plain', false);
    });
  });
});

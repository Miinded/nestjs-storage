import { Readable } from 'stream';
import { GoogleDriveService } from './google-drive.service';

describe('GoogleDriveService', () => {
  const makeService = () => {
    const service = new GoogleDriveService();
    const get = jest.fn();
    const list = jest.fn();
    const create = jest.fn();
    const update = jest.fn();
    const exportFn = jest.fn();
    const del = jest.fn();

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

  it('getStream returns response data as readable', async () => {
    const { service, get } = makeService();
    const stream = Readable.from(['chunk']);

    get.mockResolvedValue({ data: stream });

    await expect(service.getStream('file-id')).resolves.toBe(stream);
  });

  it('getStream remaps provider errors', async () => {
    const { service, get } = makeService();
    get.mockRejectedValue({ response: { status: 429 }, errors: [{ reason: 'userRateLimitExceeded' }] });

    await expect(service.getStream('file-id')).rejects.toMatchObject({
      name: 'GoogleDriveProviderError',
      operation: 'getStream',
      category: 'rate_limit',
    });
  });

  it('exists returns false when underlying list fails with not found', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'listFiles').mockRejectedValue({ response: { status: 404 } } as never);

    await expect(service.exists('/missing')).resolves.toBe(false);
  });

  it('exists rethrows mapped errors for non-not-found failures', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'listFiles').mockRejectedValue({ response: { status: 403 } } as never);

    await expect(service.exists('/forbidden')).rejects.toMatchObject({
      name: 'GoogleDriveProviderError',
      operation: 'exists',
      category: 'permission',
    });
  });

  it('listFiles returns deterministic sorted output', async () => {
    const { service } = makeService();

    jest.spyOn(service as any, '_listFolders').mockResolvedValue({ '/base': 'folderA' });
    jest.spyOn(service as any, '_listFilesInFolder').mockResolvedValue([
      { id: '2', name: 'z.txt', mimeType: 'text/plain', size: '2' },
      { id: '1', name: 'a.txt', mimeType: 'text/plain', size: '1' },
    ]);

    await expect(service.listFiles('/base')).resolves.toEqual([
      { name: 'base/a.txt', size: 1, key: '1' },
      { name: 'base/z.txt', size: 2, key: '2' },
    ]);
  });

  it('download exports spreadsheet files as csv bytes', async () => {
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

  it('download returns raw file bytes for non-spreadsheet mime types', async () => {
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

  it('uploadFile creates a new file when key does not exist', async () => {
    const { service, create } = makeService();
    jest.spyOn(service as any, '_createFolderRecursive').mockResolvedValue(undefined);
    jest.spyOn(service, 'listFiles').mockResolvedValue([{ name: 'path/', size: 0, key: 'folder-id' }]);
    create.mockResolvedValue({ data: { id: 'created-id' } });

    const result = await service.uploadFile('/path/new.txt', Buffer.from('hello'), 'text/plain');

    expect(result).toMatchObject({ id: 'created-id', key: 'path/new.txt' });
    expect(create).toHaveBeenCalled();
  });

  it('uploadFile updates existing file when key already exists', async () => {
    const { service, update } = makeService();
    jest.spyOn(service as any, '_createFolderRecursive').mockResolvedValue(undefined);
    jest.spyOn(service, 'listFiles').mockResolvedValue([{ name: 'path/existing.txt', size: 12, key: 'file-id' }]);
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

  it('getLink returns web view link', async () => {
    const { service, get } = makeService();
    get.mockResolvedValue({ data: { webViewLink: 'https://drive.google.com/file/d/abc' } });

    await expect(service.getLink('abc')).resolves.toBe('https://drive.google.com/file/d/abc');
  });

  it('delete remaps provider errors', async () => {
    const { service, del } = makeService();
    del.mockRejectedValue({ response: { status: 403 } });

    await expect(service.delete('abc')).rejects.toMatchObject({
      name: 'GoogleDriveProviderError',
      operation: 'delete',
      category: 'permission',
    });
  });

  describe('setConnection', () => {
    it('initializes drive client with provided credentials', () => {
      const service = new GoogleDriveService();

      service.setConnection('client@example.com', 'private-key-content');

      expect((service as any).driveClient).toBeDefined();
    });
  });

  describe('uploadPublicFile', () => {
    it('calls uploadFile with public flag', async () => {
      const service = new GoogleDriveService();
      const mockResult = { id: 'file-id', key: 'public/file.txt', publicUrl: null };
      const uploadSpy = jest.spyOn(service, 'uploadFile').mockResolvedValue(mockResult);

      await service.uploadPublicFile('/public/file.txt', Buffer.from('data'), 'text/plain');

      expect(uploadSpy).toHaveBeenCalledWith('/public/file.txt', expect.any(Buffer), 'text/plain', true);
    });
  });

  describe('uploadPrivateFile', () => {
    it('calls uploadFile with private flag', async () => {
      const service = new GoogleDriveService();
      const mockResult = { id: 'file-id', key: 'private/file.txt', publicUrl: null };
      const uploadSpy = jest.spyOn(service, 'uploadFile').mockResolvedValue(mockResult);

      await service.uploadPrivateFile('/private/file.txt', Buffer.from('data'), 'text/plain');

      expect(uploadSpy).toHaveBeenCalledWith('/private/file.txt', expect.any(Buffer), 'text/plain', false);
    });
  });

  describe('uploadFile with isPublic', () => {
    it('creates public file with permissions', async () => {
      const { service, create } = makeService();
      jest.spyOn(service as any, '_createFolderRecursive').mockResolvedValue(undefined);
      jest.spyOn(service, 'listFiles').mockResolvedValue([{ name: 'public/', size: 0, key: 'folder-id' }]);
      create.mockResolvedValue({ data: { id: 'public-file-id' } });

      const result = await service.uploadFile('/public/file.txt', Buffer.from('data'), 'text/plain', true);

      expect(result).toMatchObject({ id: 'public-file-id', key: 'public/file.txt' });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            permissions: [{ role: 'reader', type: 'anyone', allowFileDiscovery: false }],
          }),
        }),
      );
    });
  });

  describe('download', () => {
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

  describe('listFiles', () => {
    it('remaps listFiles errors', async () => {
      const { service, list } = makeService();
      list.mockRejectedValue({ response: { status: 500 } });

      await expect(service.listFiles('/path')).rejects.toMatchObject({
        name: 'GoogleDriveProviderError',
        operation: 'listFiles',
        category: 'unavailable',
      });
    });
  });

  describe('exists', () => {
    it('returns true when file exists', async () => {
      const { service } = makeService();
      jest.spyOn(service, 'listFiles').mockResolvedValue([{ name: 'existing-file.txt', size: 100, key: 'file-id' }]);

      const result = await service.exists('/existing-file.txt');

      expect(result).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      const { service } = makeService();
      jest.spyOn(service, 'listFiles').mockResolvedValue([]);

      const result = await service.exists('/missing-file.txt');

      expect(result).toBe(false);
    });
  });
});

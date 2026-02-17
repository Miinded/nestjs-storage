import { Injectable } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { basename, dirname } from 'path';
import { Readable } from 'stream';
import { mapGoogleDriveError } from '../common/storage-error.mapper';
import { UploadResult, FileMetadata, StorageAdapter } from '../common/storage.types';
import { validateStorageKey, escapeDriveQueryValue } from '../common/security.utils';

@Injectable()
export class GoogleDriveService implements StorageAdapter {
  private driveClient!: drive_v3.Drive;

  /**
   * Configure the underlying Google Drive client.
   * Must be called before any storage operation.
   * @param clientEmail - Service account email
   * @param privateKey - Service account private key (PEM)
   */
  setConnection(clientEmail: string, privateKey: string): void {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.readonly.metadata'],
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    this.driveClient = google.drive({ version: 'v3', auth });
  }

  private async _createFolder(folderName: string, parentFolderId: string | null): Promise<string> {
    const response = await this.driveClient.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined,
      },
      fields: 'id',
    });
    return response.data.id ?? '';
  }

  private async _createFolderRecursive(rawKey: string): Promise<void> {
    const normalizedKey = !rawKey.startsWith('/') ? `/${rawKey}` : rawKey;
    const basePath = dirname(normalizedKey).substring(1);
    const folderTmp = await this._listFolders();

    const pathSegments = basePath.split('/');

    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
      const prevPath = currentPath;
      currentPath += `/${pathSegments[i]}`;
      if (folderTmp[currentPath]) {
        continue;
      }
      folderTmp[currentPath] = await this._createFolder(pathSegments[i] ?? '', folderTmp[prevPath] ?? null);
    }
  }

  /** {@inheritDoc StorageAdapter.uploadFile} */
  async uploadFile(key: string, buffer: Buffer, mimeType: string, isPublic: boolean = false): Promise<UploadResult> {
    validateStorageKey(key);
    try {
      const normalizedKey = !key.startsWith('/') ? `/${key}` : key;
      await this._createFolderRecursive(normalizedKey);
      const basePath = dirname(normalizedKey).substring(1);
      const sortedFiles = await this.listFiles(basePath);

      const folder = sortedFiles.find((f) => f.name === `${basePath}/`.replace('//', '/'));
      const file = sortedFiles.find((f) => f.name === normalizedKey.substring(1));
      if (!file) {
        const parents = folder ? [folder.key] : [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestBody: any = {
          name: basename(normalizedKey),
          parents,
        };

        if (isPublic) {
          requestBody.permissions = [
            {
              role: 'reader',
              type: 'anyone',
              allowFileDiscovery: false,
            },
          ];
        }

        const upload = await this.driveClient.files.create({
          requestBody,
          media: {
            mimeType: mimeType,
            body: Readable.from(buffer),
          },
        });
        return {
          id: upload.data.id ?? '',
          key: normalizedKey.substring(1),
          publicUrl: isPublic ? `https://drive.google.com/file/d/${upload.data.id}` : null,
        };
      }

      const upload = await this.driveClient.files.update({
        fileId: file.key,
        media: {
          mimeType: mimeType,
          body: Readable.from(buffer),
        },
      });
      return {
        id: upload.data.id ?? '',
        key: normalizedKey.substring(1),
        publicUrl: isPublic ? `https://drive.google.com/file/d/${upload.data.id}` : null,
      };
    } catch (error) {
      throw mapGoogleDriveError('uploadFile', error);
    }
  }

  /** {@inheritDoc StorageAdapter.uploadPublicFile} */
  async uploadPublicFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    return this.uploadFile(key, buffer, mimeType, true);
  }

  /** {@inheritDoc StorageAdapter.uploadPrivateFile} */
  async uploadPrivateFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    return this.uploadFile(key, buffer, mimeType, false);
  }

  /** {@inheritDoc StorageAdapter.download} */
  async download(key: string): Promise<Uint8Array> {
    validateStorageKey(key);
    try {
      const response = await this.driveClient.files.get({
        fileId: key,
      });
      if (response.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
        const exportResponse = await this.driveClient.files.export(
          {
            fileId: key,
            mimeType: 'text/csv',
          },
          { responseType: 'arraybuffer' },
        );
        const data = exportResponse.data as unknown as ArrayBufferLike;
        return new Uint8Array(data);
      }
      const fileResponse = await this.driveClient.files.get(
        {
          fileId: key,
          alt: 'media',
        },
        { responseType: 'arraybuffer' },
      );
      const data = fileResponse.data as unknown as ArrayBufferLike;

      return new Uint8Array(data);
    } catch (error) {
      throw mapGoogleDriveError('download', error);
    }
  }

  /** {@inheritDoc StorageAdapter.getStream} */
  public async getStream(key: string): Promise<Readable> {
    validateStorageKey(key);
    try {
      const response = await this.driveClient.files.get(
        {
          fileId: key,
          alt: 'media',
        },
        { responseType: 'stream' } as unknown as drive_v3.Params$Resource$Files$Get,
      );
      return response.data as unknown as Readable;
    } catch (error) {
      throw mapGoogleDriveError('getStream', error);
    }
  }

  /** {@inheritDoc StorageAdapter.exists} */
  public async exists(key: string): Promise<boolean> {
    validateStorageKey(key);
    try {
      const normalizedKey = !key.startsWith('/') ? `/${key}` : key;
      const sortedFiles = await this.listFiles(normalizedKey);
      return !!sortedFiles.find((f) => `/${f.name}` === normalizedKey);
    } catch (error) {
      const mapped = mapGoogleDriveError('exists', error);
      if (mapped.category === 'not_found') {
        return false;
      }
      throw mapped;
    }
  }

  /** {@inheritDoc StorageAdapter.getLink} */
  public async getLink(key: string): Promise<string> {
    validateStorageKey(key);
    try {
      const response = await this.driveClient.files.get({
        fileId: key,
        fields: 'webViewLink',
      });

      if (!response.data.webViewLink) {
        throw new Error(`No webViewLink returned for file: ${key}`);
      }
      return response.data.webViewLink;
    } catch (error) {
      throw mapGoogleDriveError('getLink', error);
    }
  }

  /** {@inheritDoc StorageAdapter.listFiles} */
  public async listFiles(filepath: string): Promise<FileMetadata[]> {
    validateStorageKey(filepath);
    try {
      const normalizedPath = !filepath.startsWith('/') ? `/${filepath}` : filepath;

      const folderTmp = await this._listFolders();
      const fileList = [
        {
          name: normalizedPath,
          size: 0,
          mimeType: 'application/vnd.google-apps.folder',
          id: folderTmp[normalizedPath] ?? '',
        },
        (
          await Promise.all(
            Object.keys(folderTmp)
              .filter((i) => i.startsWith(normalizedPath))
              .map(async (i) => {
                const r = await this._listFilesInFolder(folderTmp[i] ?? '');
                return r.map((e) => {
                  e.name = `${i}/${e.name}`.replace('//', '/');
                  return e;
                });
              }),
          )
        ).flat(),
      ].flat();

      const sortedData: FileMetadata[] = [];
      fileList
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        .filter((i) => {
          const name = i.name ?? '';
          return name.startsWith(normalizedPath) && name !== `/${normalizedPath}`.replace('//', '/') && name !== '';
        })
        .forEach((i) => {
          const name = i.name ?? '';
          const { id, size, mimeType } = i;
          sortedData.push({
            name: `${name}${mimeType === 'application/vnd.google-apps.folder' ? '/' : ''}`.substring(1),
            size: Number(size ?? 0),
            key: id ?? '',
          });
        });

      return sortedData;
    } catch (error) {
      throw mapGoogleDriveError('listFiles', error);
    }
  }

  private async _listFilesInFolder(folderKey: string): Promise<drive_v3.Schema$File[]> {
    const fileList: drive_v3.Schema$File[] = [];
    let nextPageToken = '';
    do {
      const response = await this.driveClient.files.list({
        q: `trashed = false and ${folderKey !== '' ? `'${escapeDriveQueryValue(folderKey)}' in parents ` : ''}`.trim(),
        fields: 'nextPageToken, files(id, name, mimeType, size, parents)',
        orderBy: 'name',
        pageToken: nextPageToken || '',
        pageSize: 1000,
      });
      fileList.push(...(response.data.files ?? []));
      nextPageToken = response.data.nextPageToken ?? '';
    } while (nextPageToken);
    return fileList;
  }

  private async _listFolders(folderKey: string = ''): Promise<Record<string, string>> {
    const folderList: drive_v3.Schema$File[] = [];
    let nextPageToken = '';
    do {
      const response = await this.driveClient.files.list({
        q: `trashed = false and ${
          folderKey !== '' ? `'${escapeDriveQueryValue(folderKey)}' in parents and` : ''
        } mimeType='application/vnd.google-apps.folder'`.trim(),
        fields: 'nextPageToken, files(id, name, mimeType, parents)',
        orderBy: 'name',
        pageToken: nextPageToken || '',
        pageSize: 1000,
      });
      folderList.push(...(response.data.files ?? []));
      nextPageToken = response.data.nextPageToken ?? '';
    } while (nextPageToken);

    const buildFullPath = (item: drive_v3.Schema$File | undefined, data: drive_v3.Schema$File[]): string => {
      if (!item || !item.parents || item.parents.length === 0) {
        return '/';
      }

      const parent = data.find((parentItem) => parentItem.id === item?.parents?.[0]);
      const parentPath = buildFullPath(parent, data);

      return parentPath === '' ? item.name ?? '' : `${parentPath}/${item.name ?? ''}`.replace('//', '/');
    };

    const idMap: Record<string, string> = {};
    for (const item of folderList) {
      const fullPath = buildFullPath(item, folderList);
      idMap[fullPath] = item.id ?? '';
    }

    const sortedData: Record<string, string> = {};
    Object.keys(idMap)
      .sort()
      .forEach((k) => {
        sortedData[k] = idMap[k] ?? '';
      });

    return sortedData;
  }

  /** {@inheritDoc StorageAdapter.delete} */
  async delete(key: string): Promise<void> {
    validateStorageKey(key);
    try {
      await this.driveClient.files.delete({
        fileId: key,
      });
    } catch (error) {
      throw mapGoogleDriveError('delete', error);
    }
  }
}

import { Readable } from 'stream';
import { S3Service } from './s3.service';

describe('S3Service', () => {
  const makeService = () => {
    const service = new S3Service();
    const send = jest.fn();

    (service as any).s3 = { send };
    (service as any).bucket = 'bucket';

    return { service, send };
  };

  it('checkBucket ignores already-existing bucket errors', async () => {
    const { service, send } = makeService();
    send.mockRejectedValue({ name: 'BucketAlreadyExists' });

    await expect(service.checkBucket()).resolves.toBeUndefined();
  });

  it('checkBucket remaps non-idempotent errors', async () => {
    const { service, send } = makeService();
    send.mockRejectedValue({ $metadata: { httpStatusCode: 403 }, name: 'AccessDenied' });

    await expect(service.checkBucket()).rejects.toMatchObject({
      name: 'S3ProviderError',
      operation: 'checkBucket',
      category: 'permission',
    });
  });

  it('exists returns false for not found', async () => {
    const { service, send } = makeService();
    send.mockRejectedValue({ name: 'NotFound' });

    await expect(service.exists('missing-key')).resolves.toBe(false);
  });

  it('exists throws mapped error for non-not-found errors', async () => {
    const { service, send } = makeService();
    send.mockRejectedValue({ $metadata: { httpStatusCode: 403 }, name: 'AccessDenied' });

    await expect(service.exists('forbidden-key')).rejects.toMatchObject({
      name: 'S3ProviderError',
      operation: 'exists',
      category: 'permission',
    });
  });

  it('listFiles returns normalized file entries', async () => {
    const { service, send } = makeService();
    send.mockResolvedValue({
      Contents: [
        { Key: 'photos/', Size: 0 },
        { Key: 'photos/a.jpg', Size: 10 },
        { Key: 'photos/b.jpg', Size: undefined },
      ],
      NextContinuationToken: undefined,
    });

    await expect(service.listFiles('photos')).resolves.toEqual([
      { name: 'a.jpg', size: 10, key: 'photos/a.jpg' },
      { name: 'b.jpg', size: 0, key: 'photos/b.jpg' },
    ]);
  });

  it('getStream remaps errors', async () => {
    const { service, send } = makeService();
    send.mockRejectedValue({ $metadata: { httpStatusCode: 429 }, name: 'ThrottlingException' });

    await expect(service.getStream('a')).rejects.toMatchObject({
      name: 'S3ProviderError',
      operation: 'getStream',
      category: 'rate_limit',
    });
  });

  it('getStream returns a readable stream body', async () => {
    const { service, send } = makeService();
    const stream = Readable.from(['data']);

    send.mockResolvedValue({ Body: stream });

    await expect(service.getStream('a')).resolves.toBe(stream);
  });

  describe('setConnection', () => {
    it('initializes S3 client with provided credentials', () => {
      const service = new S3Service();

      service.setConnection('key', 'secret', 'http://localhost:9000', 'us-east-1', 'my-bucket');

      expect((service as any).bucket).toBe('my-bucket');
      expect((service as any).s3).toBeDefined();
    });

    it('uses default bucket name when not provided', () => {
      const service = new S3Service();

      service.setConnection('key', 'secret', 'http://localhost:9000', 'us-east-1');

      expect((service as any).bucket).toBe('private-bucket');
    });
  });

  describe('uploadFile', () => {
    it('remaps upload errors', async () => {
      const { service } = makeService();
      // Upload creates its own client internally, error is thrown when s3 client is incomplete
      await expect(service.uploadFile('test.txt', Buffer.from('data'), 'text/plain')).rejects.toMatchObject({
        name: 'S3ProviderError',
        operation: 'uploadFile',
      });
    });
  });

  describe('uploadPublicFile', () => {
    it('calls uploadFile with public flag', async () => {
      const service = new S3Service();
      const uploadSpy = jest.spyOn(service, 'uploadFile').mockResolvedValue({} as any);

      await service.uploadPublicFile('public.txt', Buffer.from('data'), 'text/plain');

      expect(uploadSpy).toHaveBeenCalledWith('public.txt', expect.any(Buffer), 'text/plain', true);
    });
  });

  describe('uploadPrivateFile', () => {
    it('calls uploadFile with private flag', async () => {
      const service = new S3Service();
      const uploadSpy = jest.spyOn(service, 'uploadFile').mockResolvedValue({} as any);

      await service.uploadPrivateFile('private.txt', Buffer.from('data'), 'text/plain');

      expect(uploadSpy).toHaveBeenCalledWith('private.txt', expect.any(Buffer), 'text/plain', false);
    });
  });

  describe('download', () => {
    it('returns byte array from response body', async () => {
      const { service, send } = makeService();
      const data = new Uint8Array([1, 2, 3, 4]);
      send.mockResolvedValue({ Body: { transformToByteArray: jest.fn().mockResolvedValue(data) } });

      await expect(service.download('file.txt')).resolves.toEqual(data);
    });

    it('throws S3ProviderError when body is empty', async () => {
      const { service, send } = makeService();
      send.mockResolvedValue({ Body: null });

      await expect(service.download('empty.txt')).rejects.toMatchObject({
        name: 'S3ProviderError',
        operation: 'download',
      });
    });

    it('remaps download errors', async () => {
      const { service, send } = makeService();
      send.mockRejectedValue({ $metadata: { httpStatusCode: 404 }, name: 'NoSuchKey' });

      await expect(service.download('missing.txt')).rejects.toMatchObject({
        name: 'S3ProviderError',
        operation: 'download',
        category: 'not_found',
      });
    });
  });

  describe('getLink', () => {
    it('remaps errors when object does not exist', async () => {
      const { service, send } = makeService();
      send.mockRejectedValue({ $metadata: { httpStatusCode: 404 }, name: 'NotFound' });

      await expect(service.getLink('missing.txt')).rejects.toMatchObject({
        name: 'S3ProviderError',
        operation: 'getLink',
        category: 'not_found',
      });
    });
  });

  describe('delete', () => {
    it('sends delete command for key', async () => {
      const { service, send } = makeService();
      send.mockResolvedValue({});

      await expect(service.delete('file.txt')).resolves.toBeUndefined();
      expect(send).toHaveBeenCalled();
    });

    it('remaps delete errors', async () => {
      const { service, send } = makeService();
      send.mockRejectedValue({ $metadata: { httpStatusCode: 403 }, name: 'AccessDenied' });

      await expect(service.delete('forbidden.txt')).rejects.toMatchObject({
        name: 'S3ProviderError',
        operation: 'delete',
        category: 'permission',
      });
    });
  });
});

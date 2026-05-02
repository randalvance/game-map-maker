export type CloudStorageErrorKind =
  | "not-configured"
  | "too-large"
  | "forbidden-key"
  | "not-found"
  | "network"
  | "unknown";

export class CloudStorageError extends Error {
  readonly kind: CloudStorageErrorKind;

  constructor(
    kind: CloudStorageErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "CloudStorageError";
    this.kind = kind;
  }
}

export type ProjectId = string;
export type CloudUrl = string;

export interface BlobClient {
  uploadTilesetImage(blob: Blob): Promise<CloudUrl>;
  uploadProjectJson(json: string, projectId: ProjectId): Promise<CloudUrl>;
  fetchProjectJson(idOrUrl: string): Promise<string>;
  isCloudConfigured(): Promise<boolean>;
}

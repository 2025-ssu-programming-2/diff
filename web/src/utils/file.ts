export type ConvertedBytes = {
  kb: number;
  mb: number;
  gb: number;
};

export const convertBytes = (bytes: number): ConvertedBytes => {
  const BYTES_IN_KB = 1024;
  const BYTES_IN_MB = 1024 * BYTES_IN_KB;
  const BYTES_IN_GB = 1024 * BYTES_IN_MB;

  return {
    kb: bytes / BYTES_IN_KB,
    mb: bytes / BYTES_IN_MB,
    gb: bytes / BYTES_IN_GB,
  };
};

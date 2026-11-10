export function getFileNameAndTypeFromPath(path: string) {
  if (!path) {
    return { fileName: '', fileType: undefined };
  }

  const normalizedPath = path.replace(/\\/g, '/');
  const fullFileName = normalizedPath.split('/').pop() ?? '';

  if (!fullFileName) {
    return { fileName: '', fileType: undefined };
  }

  const lastDotIndex = fullFileName.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return { fileName: fullFileName, fileType: undefined };
  }

  const fileType = fullFileName.substring(lastDotIndex + 1);

  return { fileName: fullFileName, fileType };
}

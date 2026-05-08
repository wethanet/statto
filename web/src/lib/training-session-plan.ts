import type { TrainingSessionPlanAttachment } from '@/lib/types';

function dataUrlToBlob(dataUrl: string, fallbackType: string) {
  const [metadata = '', encodedData = ''] = dataUrl.split(',');
  const contentType = metadata.match(/^data:([^;]+)/)?.[1] || fallbackType || 'application/octet-stream';
  const isBase64 = metadata.includes(';base64');
  const binaryValue = isBase64 ? window.atob(encodedData) : decodeURIComponent(encodedData);
  const bytes = new Uint8Array(binaryValue.length);

  for (let index = 0; index < binaryValue.length; index += 1) {
    bytes[index] = binaryValue.charCodeAt(index);
  }

  return new Blob([bytes], { type: contentType });
}

export function openTrainingSessionPlan(plan: TrainingSessionPlanAttachment) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const objectUrl = window.URL.createObjectURL(dataUrlToBlob(plan.dataUrl, plan.type));
    const link = window.document.createElement('a');

    link.href = objectUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 60000);

    return true;
  } catch {
    return false;
  }
}

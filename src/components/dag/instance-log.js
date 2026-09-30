/** Validate the response before saving: API errors must never become fake log files. */
export async function readLogBlob(response) {
  const blob = response.data, type = response.headers?.['content-type'] || blob?.type || '';
  if (!blob || typeof blob.text !== 'function') throw new Error('Unexpected log download response');
  if (type.includes('json')) {
    const error = JSON.parse(await blob.text());
    throw new Error(error.message || error.msg || 'Log download failed');
  }
  if (!type.includes('application/octet-stream') && !type.includes('text/plain')) throw new Error('Unexpected log download response');
  return blob;
}

export async function downloadInstanceLog(client, instanceId) {
  try {
    const response = await client.get('/instance/downloadLog4Console', { params: { instanceId: String(instanceId) }, responseType: 'blob', timeout: 75000 });
    const blob = await readLogBlob(response), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `powerjob-instance-${instanceId}.log`; document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  } catch (error) {
    if (error.response?.data && typeof error.response.data.text === 'function') {
      try { const body = JSON.parse(await error.response.data.text()); error.message = body.message || body.error || error.message; } catch { /* Retain transport errors for non-JSON responses. */ }
    }
    throw error;
  }
}

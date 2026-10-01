export interface SchedulePreview { times: string[]; message?: string; error?: string }
// ValidateController preserves its legacy success DTO even when validation fails.
export function schedulePreview(value: unknown): SchedulePreview {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return { times: [], error: '调度校验响应无效 / Invalid schedule validation response' };
  if (value.length === 1 && value[0] === 'It is valid, but has not trigger time list!') return { times: [], message: value[0] };
  const errors = value.filter(item => !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(item));
  return errors.length ? { times: [], error: errors.join('\n') } : { times: value };
}

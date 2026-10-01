// PowerJob uses six Quartz-style fields, with an optional year on the Server.
// These helpers generate only common rules; arbitrary existing expressions stay editable.
export const cronCadences = ['minutes', 'hours', 'daily', 'weekdays', 'weekly', 'monthly']
export const defaultCronDraft = () => ({ cadence: 'minutes', interval: 5, hour: 9, minute: 0, weekday: 2, day: 1 })
const integer = (value, min, max) => value !== '' && value != null && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max

export function cronFromDraft(draft) {
  const { cadence, interval, hour, minute, weekday, day } = draft
  if (!cronCadences.includes(cadence)) return ''
  if (cadence === 'minutes') return integer(interval, 1, 59) ? `0 0/${Number(interval)} * * * ?` : ''
  if (!integer(minute, 0, 59)) return ''
  if (cadence === 'hours') return integer(interval, 1, 23) ? `0 ${Number(minute)} 0/${Number(interval)} * * ?` : ''
  if (!integer(hour, 0, 23)) return ''
  const time = `0 ${Number(minute)} ${Number(hour)}`
  if (cadence === 'daily') return `${time} * * ?`
  if (cadence === 'weekdays') return `${time} ? * 2-6`
  if (cadence === 'weekly') return integer(weekday, 1, 7) ? `${time} ? * ${Number(weekday)}` : ''
  return integer(day, 1, 31) ? `${time} ${Number(day)} * ?` : ''
}

export function draftFromCron(expression) {
  const source = String(expression || '').trim().split(/\s+/).join(' ')
  let match
  const draft = defaultCronDraft()
  if ((match = /^0 0\/(\d+) \* \* \* \?$/.exec(source))) Object.assign(draft, { cadence: 'minutes', interval: Number(match[1]) })
  else if ((match = /^0 (\d+) 0\/(\d+) \* \* \?$/.exec(source))) Object.assign(draft, { cadence: 'hours', minute: Number(match[1]), interval: Number(match[2]) })
  else if ((match = /^0 (\d+) (\d+) \* \* \?$/.exec(source))) Object.assign(draft, { cadence: 'daily', minute: Number(match[1]), hour: Number(match[2]) })
  else if ((match = /^0 (\d+) (\d+) \? \* (2-6|[1-7])$/.exec(source))) Object.assign(draft, { cadence: match[3] === '2-6' ? 'weekdays' : 'weekly', minute: Number(match[1]), hour: Number(match[2]), weekday: match[3] === '2-6' ? 2 : Number(match[3]) })
  else if ((match = /^0 (\d+) (\d+) (\d+) \* \?$/.exec(source))) Object.assign(draft, { cadence: 'monthly', minute: Number(match[1]), hour: Number(match[2]), day: Number(match[3]) })
  else return defaultCronDraft()
  return cronFromDraft(draft) === source ? draft : defaultCronDraft()
}

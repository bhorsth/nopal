import { formatMinutesToHHMM } from '../timeFormat'

test('formats minutes to hh:mm', () => {
    expect(formatMinutesToHHMM(0)).toBe('00:00')
    expect(formatMinutesToHHMM(5)).toBe('00:05')
    expect(formatMinutesToHHMM(75)).toBe('01:15')
    expect(formatMinutesToHHMM(150)).toBe('02:30')
    expect(formatMinutesToHHMM('90')).toBe('01:30')
    expect(formatMinutesToHHMM(null)).toBe('00:00')
})

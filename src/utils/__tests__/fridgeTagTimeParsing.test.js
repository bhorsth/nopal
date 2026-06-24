import { FridgeTagParser, toJson } from '../fridgeTagParser'
import { parseFridgeTagJson } from '../fridgeTagJsonParser'
import { parseHmToMinutes } from '../timeFormat'

describe('fridgeTag time parsing', () => {
    it('parseHmToMinutes converts HH:mm to total minutes', () => {
        expect(parseHmToMinutes('0:45')).toBe(45)
        expect(parseHmToMinutes('1:30')).toBe(90)
    })

    it('parseFridgeTagJson converts alarm accumulated time to minutes', () => {
        const parsed = parseFridgeTagJson({
            configuration: { serialNumber: '123', alarmSettings: {} },
            historyRecords: [
                {
                    date: '2024-01-01',
                    alarms: {
                        0: { accumulatedTime: '1:15', alarmCount: 1 },
                    },
                },
            ],
        })

        expect(parsed.history.records[0].alarms[0].accumulatedMinutes).toBe(75)
    })

    it('FridgeTagParser text export converts t Acc to minutes', () => {
        const text = [
            'Device: FridgeTag',
            '  Conf:',
            '    Serial: 999',
            '  Hist:',
            '    1:',
            '      Date: 2024-01-01',
            '      Alarm:',
            '        0:',
            '          t Acc: 0:45',
        ].join('\n')

        const raw = new FridgeTagParser().parseText(text)
        const json = toJson(raw)
        expect(json.history.records[0].alarms[0].accumulatedMinutes).toBe(45)
    })
})

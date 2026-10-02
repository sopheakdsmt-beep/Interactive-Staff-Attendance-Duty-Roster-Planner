# Vien · វេន

Landscape tablet planner for a fair monthly duty roster. Department heads, shift supervisors, hospital floor managers, and hospitality leads can see a full month across 16 people at once, move shifts with a finger or a stylus, and send the finished board to a Telegram group.

## What you can do

- Scan morning, afternoon, and night cover for every day. Counts turn red when a shift falls under the minimum.
- Drag a shift from the tray onto a day, or tap a shift and then tap cells with a stylus.
- Long-press a filled cell and drag it onto another person to swap. An empty cell receives the shift.
- Watch duty hours update as you edit. The number beside each name is hours; the smaller number is how far they sit from their fair share after leave. Green is within one shift.
- Approve or decline leave and training. Approved time stays on the grid when you press **Balance**, which rebuilds the open days around it.
- Undo and redo. Keyboard: `M` `A` `N` `L` `O` `T` assign the selected cell, arrows move, Delete clears, Ctrl/⌘Z undoes.
- Switch between Sunrise Hospital’s emergency floor and Riverside Hotel’s front office. Khmer and English use the same board.
- Export a high-resolution PNG or an A3 landscape PDF. **Send PNG to Telegram** uses the tablet share sheet when the browser allows file sharing, so the ward group receives the image. Otherwise the PNG downloads, the caption is copied, and Telegram opens ready for you to attach it.

The day after a night shift is a rest day. Fairness is 100 when everyone’s duty hours match the share their available days justify, so a person on leave is not asked to “catch up” the hours they were away.

## Run it

```bash
npm install
npm test
npm run dev
```

Open the app on a tablet in landscape, or widen a desktop window. The roster for the current month is saved in this browser.

## Roster rules

| Shift | Hours | Time |
| --- | --- | --- |
| Morning | 8 | 07:00–15:00 |
| Afternoon | 8 | 15:00–23:00 |
| Night | 8 | 23:00–07:00 |
| Training | 8 | 08:00–16:00 |
| Leave / Off | 0 | not on duty |

Emergency floor aims for 5 / 4 / 3 on morning, afternoon, and night, and never drops under 4 / 3 / 2. Front office aims for 4 / 4 / 2 and stays at or above 3 / 3 / 2.

Inter and Noto Sans Khmer / Noto Serif Khmer are bundled under the SIL Open Font License 1.1.

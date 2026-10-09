(function attachPlotTwistData(root, factory) {
  const data = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = data;
  }

  root.PlotTwistData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlotTwistData() {
  "use strict";

  const cases = [
    {
      "id": "crimson-orchid",
      "caseNumber": 1,
      "title": "The Crimson Orchid",
      "subtitle": "A locked glasshouse. An empty pot. Twelve missing minutes.",
      "location": "Marrow House Conservatory",
      "incident": "8:32–8:45 PM",
      "difficulty": "Gentle",
      "fileMark": "BOTANY / THEFT",
      "brief": [
        "At 8:45, the curator unlocked the public doors and found Marrow House's priceless Crimson Orchid missing. Its ceramic display pot was untouched, and the conservatory alarm never sounded.",
        "Three people were still inside the estate. One of them moved a living plant out of a room that records every opening of its main door."
      ],
      "question": "Who took the orchid, and how did it leave the glasshouse?",
      "suspects": [
        {
          "id": "nadia",
          "name": "Nadia Moss",
          "role": "Assistant botanist",
          "initials": "NM",
          "statement": "I misted the east bench until closing. I never touched the potting trolley."
        },
        {
          "id": "rohan",
          "name": "Rohan Pike",
          "role": "Estate electrician",
          "initials": "RP",
          "statement": "The lights fluttered. I stayed at the fuse cabinet until they steadied."
        },
        {
          "id": "celeste",
          "name": "Celeste Vane",
          "role": "Patron of the exhibit",
          "initials": "CV",
          "statement": "I waited in the marble lobby. Orchids dislike me almost as much as I dislike humidity."
        }
      ],
      "theories": [
        {
          "id": "cart-hatch",
          "label": "Hidden in a nursery sleeve beneath the potting cart, then passed through the service hatch"
        },
        {
          "id": "coat-door",
          "label": "Wrapped in a coat and carried through the alarmed main door"
        },
        {
          "id": "label-switch",
          "label": "Relabelled days earlier and collected as ordinary greenhouse stock"
        }
      ],
      "clues": [
        {
          "glyph": "▥",
          "tag": "ACCESS LOG",
          "title": "One badge, one visit",
          "text": "Nadia's badge opened the main door at 8:32 and logged her exit at 8:44. No other door event occurred before the orchid was reported missing."
        },
        {
          "glyph": "◌",
          "tag": "POT",
          "title": "A clean crescent",
          "text": "The ceramic display pot contains undisturbed compost and a clean crescent where a removable black nursery sleeve had rested. The orchid was lifted without its display pot."
        },
        {
          "glyph": "⌇",
          "tag": "WATER LOG",
          "title": "The dry east bench",
          "text": "Automatic misting finished at 7:55. The east-bench leaves and floor are bone-dry, contradicting Nadia's account of twelve minutes spent misting there."
        },
        {
          "glyph": "▰",
          "tag": "TROLLEY",
          "title": "A damp ring below",
          "text": "The potting cart's lower shelf holds a damp crescent, black nursery grit, and one red petal. Its canvas skirt hides the entire shelf from view."
        },
        {
          "glyph": "↗",
          "tag": "FLOOR PLAN",
          "title": "The door that is not a door",
          "text": "A waist-high service hatch beside the potting cart opens into the loading corridor. It moves supplies but is absent from the alarm's door log."
        }
      ],
      "hints": [
        "The alarm log proves how people entered—not necessarily how a plant left.",
        "Compare Nadia's statement with the water log, then follow the black nursery grit."
      ],
      "solution": {
        "culpritId": "nadia",
        "theoryId": "cart-hatch",
        "title": "The flower travelled freight class.",
        "explanation": "Nadia lifted the orchid in its removable nursery sleeve, hid it behind the potting cart's canvas skirt, and rolled the cart beside the unmonitored service hatch. Her misting story covered the time she needed; the dry bench proves that story false. The damp crescent, nursery grit, and petal trace the orchid to the cart, while the hatch explains how it left without another door event.",
        "proof": [
          "The dry bench breaks Nadia's alibi",
          "The cart carries a physical trace of the orchid",
          "The service hatch bypasses the logged door"
        ]
      }
    },
    {
      "id": "platform-four",
      "caseNumber": 2,
      "title": "The Letter at Platform Four",
      "subtitle": "Sixty seconds of darkness was enough to steal only the words.",
      "location": "Northcross Station Café",
      "incident": "6:14–6:15 PM",
      "difficulty": "Measured",
      "fileMark": "RAIL / MANUSCRIPT",
      "brief": [
        "A sealed display envelope in the station café held the final page of novelist Vera Bell's unpublished book. During a one-minute blackout, the page vanished. The envelope's red wax seal remained perfect.",
        "The glass case was in view of the counter, the departure board, and a café table. Everyone insists the blackout caught them where they stood."
      ],
      "question": "Who stole the page, and how was the intact seal defeated?",
      "suspects": [
        {
          "id": "milo",
          "name": "Milo Penn",
          "role": "Café manager",
          "initials": "MP",
          "statement": "I stayed behind the till. In the dark, I could barely find the candles."
        },
        {
          "id": "june",
          "name": "June Sato",
          "role": "Bicycle courier",
          "initials": "JS",
          "statement": "I was scanning my platform ticket when the lights failed."
        },
        {
          "id": "arun",
          "name": "Arun Bell",
          "role": "Novelist's nephew",
          "initials": "AB",
          "statement": "I watched the departure clock. I wanted the page, but not badly enough to miss my train."
        }
      ],
      "theories": [
        {
          "id": "rear-panel",
          "label": "Opened the case's rear service panel and removed the page without touching the envelope seal"
        },
        {
          "id": "wax-cast",
          "label": "Made a duplicate wax seal, opened the envelope, and resealed it during the blackout"
        },
        {
          "id": "glass-slit",
          "label": "Pulled the page through a narrow gap in the front glass with wire"
        }
      ],
      "clues": [
        {
          "glyph": "◆",
          "tag": "RED WAX",
          "title": "A truly intact seal",
          "text": "The wax bears Vera Bell's tiny fingerprint and has no reheating marks. The envelope was not opened after it entered the case."
        },
        {
          "glyph": "□",
          "tag": "DISPLAY CASE",
          "title": "Built for quick changes",
          "text": "The display has a rear service panel for replacing menus. It opens with the same square pantry key kept on the café manager's ring."
        },
        {
          "glyph": "ϟ",
          "tag": "POWER BOX",
          "title": "A theatrical blackout",
          "text": "Nothing failed. The café's lighting breaker was manually lowered. It sits eighteen centimetres below the till."
        },
        {
          "glyph": "◒",
          "tag": "CUP",
          "title": "Coffee behind the case",
          "text": "A fresh dark-coffee ring marks the hidden rear shelf. Milo drinks black coffee; June ordered tea and Arun carried no cup."
        },
        {
          "glyph": "⌁",
          "tag": "TIMESTAMPS",
          "title": "Two clocks agree",
          "text": "June's platform scanner registered at 6:14:22. Arun's train gate opened under camera at 6:14:31. Both were outside the café before the lights returned."
        }
      ],
      "hints": [
        "An intact envelope does not mean an intact display case.",
        "Only one person could reach both the breaker and the square pantry key without moving from his claimed position."
      ],
      "solution": {
        "culpritId": "milo",
        "theoryId": "rear-panel",
        "title": "The seal was never the lock.",
        "explanation": "Milo staged the blackout from the breaker beneath his till, used his square pantry key on the case's rear panel, and slid the manuscript page out of the still-sealed envelope through its open top. The fresh coffee ring places him behind the case. June and Arun were both captured outside the café during the crucial minute.",
        "proof": [
          "The seal was never disturbed",
          "Milo controlled the breaker and service key",
          "His coffee marks the concealed access point"
        ]
      }
    },
    {
      "id": "silent-bell",
      "caseNumber": 3,
      "title": "The Silent Bell",
      "subtitle": "The museum alarm trusted weight. The thief trusted theatre paint.",
      "location": "Aster Museum, East Gallery",
      "incident": "Thursday, 5:40–6:00 PM",
      "difficulty": "Measured",
      "fileMark": "MUSEUM / SUBSTITUTION",
      "brief": [
        "The Aster Museum's silver Pilgrim Bell disappeared from a pressure-alarmed plinth. The alarm never changed weight, and the object under the glass looked correct until a curator noticed it made no sound.",
        "The silent object is a painted brass rehearsal bell. Someone prepared a replacement and balanced it precisely."
      ],
      "question": "Who made the substitution, and how was the weight alarm fooled?",
      "suspects": [
        {
          "id": "inez",
          "name": "Inez Vale",
          "role": "Metal conservator",
          "initials": "IV",
          "statement": "I polished the real bell on Tuesday. I have not handled the rehearsal pieces this month."
        },
        {
          "id": "bo",
          "name": "Bo Mercer",
          "role": "Night guard",
          "initials": "BM",
          "statement": "My round passed the east gallery every ten minutes. The display never looked disturbed."
        },
        {
          "id": "mae",
          "name": "Mae Aster",
          "role": "Museum benefactor",
          "initials": "MA",
          "statement": "I donated it. Selling it would be a rather circular form of generosity."
        }
      ],
      "theories": [
        {
          "id": "weighted-replica",
          "label": "Swapped in a painted rehearsal bell weighted internally with conservation lead"
        },
        {
          "id": "plinth-brace",
          "label": "Braced the pressure plate from beneath while removing the bell"
        },
        {
          "id": "alarm-magnet",
          "label": "Held the weight sensor in place with a strong magnet during the theft"
        }
      ],
      "clues": [
        {
          "glyph": "⚖",
          "tag": "PLINTH",
          "title": "Exact to the gram",
          "text": "The false bell weighs 1,842 grams—the exact registered weight of the original. A loose object shifts inside its hollow base."
        },
        {
          "glyph": "◐",
          "tag": "X-RAY",
          "title": "A hidden half-moon",
          "text": "Imaging reveals a crescent of soft lead screwed inside the replica. The lead has been cut with fine conservation shears."
        },
        {
          "glyph": "▧",
          "tag": "LOAN BOOK",
          "title": "Rehearsal piece 3B",
          "text": "Inez signed out rehearsal bell 3B on Wednesday for 'surface comparison.' She returned it Thursday morning."
        },
        {
          "glyph": "✦",
          "tag": "PAINT FLAKE",
          "title": "Silver over brass",
          "text": "A metallic paint flake under Inez's drying rack matches the replica's fresh coating. It contains the museum workshop's rare mica binder."
        },
        {
          "glyph": "⌚",
          "tag": "GUARD CLOCK",
          "title": "A narrow workshop window",
          "text": "Bo's mechanical checkpoint card confirms every round. Mae was speaking on the gallery stage when Inez alone wheeled a covered conservation crate past the plinth."
        }
      ],
      "hints": [
        "The alarm did exactly what it was designed to do: notice a change in weight.",
        "Ask who had access to the replica, the lead, the right shears, and the matching paint."
      ],
      "solution": {
        "culpritId": "inez",
        "theoryId": "weighted-replica",
        "title": "A perfect weight, and a hollow alibi.",
        "explanation": "Inez prepared rehearsal bell 3B with silver paint and a carefully cut crescent of conservation lead until it matched the Pilgrim Bell gram for gram. During her authorised crate movement, she exchanged the objects. The pressure alarm saw no change. The loan signature, workshop-only mica paint, and shear-cut lead make the preparation uniquely hers.",
        "proof": [
          "The replica was tuned to the alarm's exact weight",
          "Workshop materials link the preparation to Inez",
          "Her crate supplied the opportunity"
        ]
      }
    },
    {
      "id": "midnight-broadcast",
      "caseNumber": 4,
      "title": "The Midnight Broadcast",
      "subtitle": "The ending leaked before the actors spoke it aloud.",
      "location": "WNR Radio Theatre",
      "incident": "11:20–11:48 PM",
      "difficulty": "Sharp",
      "fileMark": "RADIO / LEAK",
      "brief": [
        "At 11:48, minutes before WNR's live mystery drama, a rival station broadcast the secret final line. Only three numbered script copies existed, and all three were still in their owners' hands.",
        "The rival received a typed note, not a photograph. Someone copied the ending without surrendering their script."
      ],
      "question": "Who leaked the ending, and what copying trick did they use?",
      "suspects": [
        {
          "id": "ada",
          "name": "Ada North",
          "role": "Lead actor",
          "initials": "AN",
          "statement": "My script stayed on my music stand while I warmed up in Studio B."
        },
        {
          "id": "sol",
          "name": "Sol Reed",
          "role": "Sound engineer",
          "initials": "SR",
          "statement": "I was cueing shellac effects. I heard the final line for the first time on air."
        },
        {
          "id": "viola",
          "name": "Viola Crane",
          "role": "Programme sponsor",
          "initials": "VC",
          "statement": "My courtesy copy remained sealed in its blue folder. I never even read the thing."
        }
      ],
      "theories": [
        {
          "id": "carbon-copy",
          "label": "Typed the ending with carbon paper hidden beneath the sheet, creating a second copy in one pass"
        },
        {
          "id": "vent-recording",
          "label": "Recorded rehearsal through the studio vent and transcribed the final line"
        },
        {
          "id": "cue-sheet",
          "label": "Reconstructed the ending from sound-effect cues and actor entrances"
        }
      ],
      "clues": [
        {
          "glyph": "C",
          "tag": "SCRIPT COPIES",
          "title": "A private correction",
          "text": "The leaked line includes 'the harbour keeps its dead'—a correction handwritten only on copy C, Viola's sponsor copy. Copies A and B still say 'secrets.'"
        },
        {
          "glyph": "▤",
          "tag": "BLUE FOLDER",
          "title": "Sealed, but not untouched",
          "text": "Viola's folder seal is intact. Its bottom edge, however, was never glued; the script slides out cleanly without breaking the seal."
        },
        {
          "glyph": "≋",
          "tag": "TYPEWRITER",
          "title": "The ghost beneath the words",
          "text": "The rival's note carries faint blue pressure marks behind the black letters. They are characteristic of a carbon sheet placed under the typed page."
        },
        {
          "glyph": "V",
          "tag": "RIBBON TEST",
          "title": "A chipped capital V",
          "text": "The note's capital V has a missing left serif. The same defect appears on the sponsor lounge typewriter and nowhere else in WNR."
        },
        {
          "glyph": "☎",
          "tag": "SWITCHBOARD",
          "title": "One brief outside line",
          "text": "At 11:42, the sponsor lounge placed a forty-second call to the rival station's news desk. Viola signed the room register at 11:39."
        }
      ],
      "hints": [
        "The unique corrected wording identifies which script supplied the leak.",
        "The note was produced by a particular machine, and its pale blue marks reveal a second sheet."
      ],
      "solution": {
        "culpritId": "viola",
        "theoryId": "carbon-copy",
        "title": "Copy C made copy D.",
        "explanation": "Viola slid copy C through the unglued bottom of its ceremonial folder, typed the corrected final line in the sponsor lounge with carbon paper beneath it, and phoned the duplicate to WNR's rival. The unique correction identifies her script; the chipped V identifies her typewriter; the blue pressure marks reveal the carbon copy.",
        "proof": [
          "Only Viola's copy contains the leaked correction",
          "The sponsor typewriter left its broken-serif signature",
          "The lounge call delivered the line"
        ]
      }
    },
    {
      "id": "cabin-nine",
      "caseNumber": 5,
      "title": "Cabin Nine",
      "subtitle": "A jewel vanished from a room no stranger entered.",
      "location": "The Night Meridian, Sleeper Car",
      "incident": "1:05–1:40 AM",
      "difficulty": "Sharp",
      "fileMark": "RAIL / INSURANCE",
      "brief": [
        "Journalist Noor Dey reported her emerald brooch stolen from locked Cabin Nine while she dined two cars away. The corridor seal was unbroken, the window opens only eight centimetres, and the porter retained his passkey.",
        "At 1:40, a green stone was found beneath Noor's washbasin. She called it proof that a thief had fumbled the jewel while escaping."
      ],
      "question": "Who engineered the impossible theft, and what was the real aim?",
      "suspects": [
        {
          "id": "noor",
          "name": "Noor Dey",
          "role": "Journalist and owner",
          "initials": "ND",
          "statement": "The brooch was on my washstand. Someone entered despite the seal—I cannot explain it."
        },
        {
          "id": "elias",
          "name": "Elias Ward",
          "role": "Sleeper-car porter",
          "initials": "EW",
          "statement": "My passkey stayed chained to my belt. I sealed the corridor myself."
        },
        {
          "id": "sable",
          "name": "Sable Fox",
          "role": "Touring illusionist",
          "initials": "SF",
          "statement": "An impossible room is usually a very possible lie. This one is not my trick."
        }
      ],
      "theories": [
        {
          "id": "staged-claim",
          "label": "Replaced the real brooch with paste, disposed of the fake stone, and staged an insurance claim"
        },
        {
          "id": "window-fishing",
          "label": "Hooked the brooch through the narrow window from the carriage platform"
        },
        {
          "id": "copied-passkey",
          "label": "Made a wax impression of the porter's passkey and entered before the corridor was sealed"
        }
      ],
      "clues": [
        {
          "glyph": "◇",
          "tag": "GREEN STONE",
          "title": "Glass under the basin",
          "text": "The loose green stone scratches at hardness 5.5. Emerald should score 7.5 or higher. The recovered stone is bottle glass."
        },
        {
          "glyph": "⌁",
          "tag": "BROOCH CLASP",
          "title": "A deliberate fracture",
          "text": "The clasp found on the washstand has parallel file marks and fresh brass beneath them. It was weakened before the train departed."
        },
        {
          "glyph": "▭",
          "tag": "TELEGRAM",
          "title": "Insured in a hurry",
          "text": "Noor tripled the brooch's insurance yesterday afternoon and requested coverage beginning precisely at midnight."
        },
        {
          "glyph": "✧",
          "tag": "PAWNSHOP WIRE",
          "title": "An emerald heading south",
          "text": "A dealer in the previous city logged the real brooch's maker mark at 4:10 PM—two hours before Noor boarded the Night Meridian."
        },
        {
          "glyph": "▣",
          "tag": "CORRIDOR SEAL",
          "title": "The locked room holds",
          "text": "The numbered paper seal, window soot, and key chain are all intact. There is no physical evidence that anyone entered Cabin Nine after dinner."
        }
      ],
      "hints": [
        "Start by asking whether the recovered stone was ever part of an emerald brooch.",
        "The real jewel's timeline ends before the train journey begins."
      ],
      "solution": {
        "culpritId": "noor",
        "theoryId": "staged-claim",
        "title": "There was no theft aboard the train.",
        "explanation": "Noor sold or pledged the real brooch before boarding, weakened a cheap replica's clasp, and dropped its glass stone beneath the basin. She then reported an impossible locked-cabin theft to activate newly increased insurance. The dealer's maker-mark record places the real jewel off the train, and every cabin seal confirms that no intruder was needed.",
        "proof": [
          "The recovered 'emerald' is bottle glass",
          "The clasp was prepared to fail",
          "The real brooch was logged in another city"
        ]
      }
    },
    {
      "id": "saffron-impression",
      "caseNumber": 6,
      "title": "The Saffron Impression",
      "subtitle": "The recipe never left its drawer. Its shadow did.",
      "location": "Sunroom Bakery",
      "incident": "Monday, 4:50–6:00 PM",
      "difficulty": "Gentle",
      "fileMark": "BAKERY / SECRET",
      "brief": [
        "Sunroom Bakery locked its prize saffron-bun recipe in a desk at closing. At dawn, a rival shop displayed the exact recipe—including its strange pinch of black salt. The drawer's paper seal was intact.",
        "Three afternoon visitors stood beside the recipe before it was locked away. One copied it without a camera, a key, or even a pencil."
      ],
      "question": "Who copied the recipe, and what ordinary material carried the words away?",
      "suspects": [
        {
          "id": "pippa",
          "name": "Pippa Lo",
          "role": "Bakery apprentice",
          "initials": "PL",
          "statement": "I weighed saffron at the far counter. I know most of the recipe already, but not the salt."
        },
        {
          "id": "basil",
          "name": "Basil Crow",
          "role": "Food critic",
          "initials": "BC",
          "statement": "I wrote tasting notes beside the desk. Trade secrets make terribly dry reading."
        },
        {
          "id": "emi",
          "name": "Emi Rose",
          "role": "Florist and supplier",
          "initials": "ER",
          "statement": "I set down a damp bouquet, collected my invoice, and left. I never opened a drawer."
        }
      ],
      "theories": [
        {
          "id": "wax-transfer",
          "label": "Pressed damp waxed bouquet paper onto the violet-pencil recipe and read the reversed transfer later"
        },
        {
          "id": "blotter-rubbing",
          "label": "Made a pencil rubbing of indentations left on the desk blotter"
        },
        {
          "id": "memory-tasting",
          "label": "Deduced every quantity by tasting a finished bun and guessing the method"
        }
      ],
      "clues": [
        {
          "glyph": "▱",
          "tag": "DRAWER SEAL",
          "title": "A secret that stayed put",
          "text": "The recipe card remains inside the desk. Its numbered paper seal and old lock dust are undisturbed. The information—not the card—was stolen."
        },
        {
          "glyph": "✎",
          "tag": "RECIPE CARD",
          "title": "Violet pencil",
          "text": "The baker writes with a soft violet copying pencil. When dampened, its pigment transfers readily onto paper pressed against it."
        },
        {
          "glyph": "❧",
          "tag": "DESK SURFACE",
          "title": "Fern-shaped moisture",
          "text": "The recipe card bears a faint damp outline shaped like fern leaves. Emi's bouquet used the same fern as packing greenery."
        },
        {
          "glyph": "↔",
          "tag": "RIVAL'S NOTE",
          "title": "Letters in reverse",
          "text": "Beneath the rival baker's black-ink copy are faint reversed violet words: 'black salt, one pinch.' They read correctly in a mirror."
        },
        {
          "glyph": "◫",
          "tag": "DELIVERY PAPER",
          "title": "One sheet too few",
          "text": "Emi's delivery roll is waxed on one side and missing its final numbered sheet. A torn corner in her invoice book carries violet pigment."
        }
      ],
      "hints": [
        "The reversed words were transferred by contact, not written from memory.",
        "Violet copying pencil, moisture, and one missing sheet of bouquet paper form a complete copying method."
      ],
      "solution": {
        "culpritId": "emi",
        "theoryId": "wax-transfer",
        "title": "The bouquet took an impression.",
        "explanation": "Emi laid damp waxed wrapping over the face-up recipe while collecting her invoice. Moisture activated the soft violet copying pencil, leaving a reversed impression on the paper. She removed that sheet with the bouquet and read it in a mirror. The fern-shaped moisture mark, reversed violet text, and missing numbered paper all trace the copy to her.",
        "proof": [
          "The recipe itself never left the sealed drawer",
          "The rival's note preserves a reversed violet transfer",
          "Emi's damp wrapping supplied the copying surface"
        ]
      }
    },
    {
      "id": "clockmakers-tuesday",
      "caseNumber": 7,
      "title": "The Clockmaker's Tuesday",
      "subtitle": "At quarter past four, a clock that cannot chime gave someone away.",
      "location": "Morrow & Son, Watchmakers",
      "incident": "4:10–4:20 PM",
      "difficulty": "Sharp",
      "fileMark": "WATCH / LOCKED COUNTER",
      "brief": [
        "A prototype silver pocket watch vanished from a velvet tray behind the shop counter. The front door stayed in view, no one crossed the counter gate, and the tray glass was found closed.",
        "Three visitors stood close enough to admire the watch. Only one describes a sound the shop could never make."
      ],
      "question": "Who took the watch, and how did they lift it without crossing the counter?",
      "suspects": [
        {
          "id": "elian",
          "name": "Elian Morrow",
          "role": "Clockmaker's apprentice",
          "initials": "EM",
          "statement": "I stepped out for tea at ten past four and returned before the hour."
        },
        {
          "id": "ruth",
          "name": "Ruth Kline",
          "role": "Parcel courier",
          "initials": "RK",
          "statement": "I signed the delivery book, set two boxes down, and left at 4:14."
        },
        {
          "id": "vale",
          "name": "August Vale",
          "role": "Watch collector",
          "initials": "AV",
          "statement": "I remained by the front case. I distinctly heard the shop clock chime quarter past four."
        }
      ],
      "theories": [
        {
          "id": "magnet-cane",
          "label": "Used a magnet concealed in a hollow cane to lift the watch by its steel chain"
        },
        {
          "id": "parcel-switch",
          "label": "Lowered an open parcel over the tray and trapped the watch inside it"
        },
        {
          "id": "thread-pulley",
          "label": "Looped thread through the counter grille and dragged the watch across the velvet"
        }
      ],
      "clues": [
        {
          "glyph": "¼",
          "tag": "SHOP CLOCK",
          "title": "No quarter chime",
          "text": "The regulator clock strikes only on the hour. Its movement has no quarter-chime train and never has. August's vivid 4:15 memory is invented."
        },
        {
          "glyph": "○",
          "tag": "VELVET TRAY",
          "title": "A round absence",
          "text": "Dust on the glass above the tray shows a clean circular mark, 28 millimetres wide—the exact diameter of August's silver cane ferrule."
        },
        {
          "glyph": "↟",
          "tag": "COUNTER GLASS",
          "title": "The lid lifts upward",
          "text": "The tray's glass lid is not locked. From the customer side, a long object can raise it through the ornamental brass grille."
        },
        {
          "glyph": "⊕",
          "tag": "COMPASS",
          "title": "North follows the cane",
          "text": "A watchmaker's compass swings forty degrees when August's cane passes. The ferrule conceals a strong horseshoe magnet."
        },
        {
          "glyph": "⌁",
          "tag": "CHAIN LINK",
          "title": "One link left behind",
          "text": "A broken steel chain link clings inside the magnetised ferrule. The prototype's silver case is non-magnetic, but its safety chain is steel."
        }
      ],
      "hints": [
        "August supplies a precise time marker, but verify whether the clock could supply it.",
        "The watch case is silver; another attached part would still answer a magnet."
      ],
      "solution": {
        "culpritId": "vale",
        "theoryId": "magnet-cane",
        "title": "The cane had an attraction to fine watches.",
        "explanation": "August invented the quarter chime to anchor his false alibi. From the customer side, he fed his hollow cane through the brass grille, lifted the unlocked glass lid, and caught the watch's steel safety chain with the concealed magnet. The circular dust mark fixes the cane above the tray, and the broken chain link remains attached to the ferrule.",
        "proof": [
          "August describes a chime the clock cannot make",
          "His cane matches the circular trace on the glass",
          "Its hidden magnet holds the watch's broken chain link"
        ]
      }
    },
    {
      "id": "batch-a-dahlia-above-plot-twelve",
      "caseNumber": 8,
      "title": "The Dahlia Above Plot Twelve",
      "subtitle": "The greenhouse stayed locked. Someone simply reached farther.",
      "location": "Hearthside Community Garden",
      "incident": "6:00–6:20 AM",
      "difficulty": "Measured",
      "fileMark": "GARDEN / FLOWER",
      "brief": [
        "On judging morning, the single prize bloom of Hearthside's midnight dahlia was found neatly removed from its stem. The rooftop greenhouse door was still tied with the chairperson's numbered paper seal.",
        "Only three early visitors were on the community-centre roof. None had the greenhouse key, and each insists they stayed outside the railing around Plot Twelve."
      ],
      "question": "Who removed the dahlia, and how did they reach it without opening the greenhouse?",
      "suspects": [
        {
          "id": "mara",
          "name": "Mara Sen",
          "role": "Garden chairperson",
          "initials": "MS",
          "statement": "I checked the door seal from the stairwell, then went downstairs to fetch the ribbons."
        },
        {
          "id": "theo",
          "name": "Theo Brook",
          "role": "Bird-count volunteer",
          "initials": "TB",
          "statement": "I recorded swifts from the far parapet. My equipment never went near Plot Twelve."
        },
        {
          "id": "elsie",
          "name": "Elsie Quill",
          "role": "Neighbourhood florist",
          "initials": "EQ",
          "statement": "I delivered empty vases at six and left them beside the lift. I had no cutting tools."
        }
      ],
      "theories": [
        {
          "id": "picker-through-vent",
          "label": "Reached through the roof louver with a telescoping litter picker and pulled the bloom out"
        },
        {
          "id": "duplicate-door-key",
          "label": "Opened the sealed door with a duplicate key, then replaced the paper seal"
        },
        {
          "id": "cut-night-before",
          "label": "Cut the flower the previous evening and propped it on the stem until morning"
        }
      ],
      "clues": [
        {
          "glyph": "◇",
          "tag": "DOOR SEAL",
          "title": "One unbroken number",
          "text": "Seal 041 is genuine, its gum is fully dry, and its fibres remain continuous across the door gap. The greenhouse door did not open after closing."
        },
        {
          "glyph": "↥",
          "tag": "ROOF LOUVER",
          "title": "A gap above the bloom",
          "text": "A twenty-two-centimetre-wide ventilation louver stands directly above the dahlia. Its insect screen is unhooked at one corner. The fourteen-centimetre bloom is 1.8 metres below it; the picker's closed head is nine centimetres, so both fit through the opening."
        },
        {
          "glyph": ")(",
          "tag": "STEM",
          "title": "Crushed, not clipped",
          "text": "The stem ends in two opposing crescent dents. Sharp shears would leave a flat slice; padded gripping jaws made this crushed break."
        },
        {
          "glyph": "▰",
          "tag": "FOAM TRACE",
          "title": "Yellow in the green",
          "text": "A fleck of yellow closed-cell foam clings to the broken stem. Theo's telescoping litter picker has yellow foam lining both jaws."
        },
        {
          "glyph": "⌖",
          "tag": "BIRD LOG",
          "title": "The recording moved",
          "text": "Theo's 6:12 swift recording contains the greenhouse vent fan at full volume, not the distant parapet wind. A red dahlia petal is folded inside his picker's telescoping joint."
        }
      ],
      "hints": [
        "Treat the intact door seal as reliable. Look for an opening meant for air rather than people.",
        "The shape of the damage identifies a gripping tool, and one suspect brought an extendable one to the roof."
      ],
      "solution": {
        "culpritId": "theo",
        "theoryId": "picker-through-vent",
        "title": "The flower was taken at arm's length.",
        "explanation": "Theo unhooked one corner of the louver's insect screen, lowered his telescoping litter picker, gripped the fourteen-centimetre dahlia through the padded jaws, and drew it back through the twenty-two-centimetre opening. The door seal is truly intact. The twin crescent dents and yellow foam identify the tool, while the loud vent fan and trapped petal place Theo and his picker beside the greenhouse rather than at the far parapet.",
        "proof": [
          "The roof louver bypasses the sealed door",
          "Padded jaws explain the paired crush marks",
          "Theo's recording and picker carry traces from the scene"
        ]
      }
    },
    {
      "id": "batch-a-moustache-in-cobalt",
      "caseNumber": 9,
      "title": "The Moustache in Cobalt",
      "subtitle": "A portrait was defaced without touching a drop of paint.",
      "location": "Maple Lane Portrait Show",
      "incident": "Saturday, 3:10–3:35 PM",
      "difficulty": "Gentle",
      "fileMark": "GALLERY / MISCHIEF",
      "brief": [
        "Minutes before the neighbourhood portrait show opened, a sweeping blue moustache appeared across Mrs. D'Souza's painted face. The frame's signed hanging wire and all four backing seals were intact.",
        "The artist insists the portrait was clean at three o'clock. Three exhibitors crossed the little gallery before the mark was noticed."
      ],
      "question": "Who added the moustache, and how was the sealed portrait left unharmed?",
      "suspects": [
        {
          "id": "mara",
          "name": "Mara D'Souza",
          "role": "Portrait artist",
          "initials": "MD",
          "statement": "It is my grandmother's portrait. I checked the paint, glass, and seals before hanging it."
        },
        {
          "id": "felix",
          "name": "Felix Ward",
          "role": "Volunteer framer",
          "initials": "FW",
          "statement": "I dusted the frames with a dry cloth. I never unsealed Mara's backing board."
        },
        {
          "id": "kit",
          "name": "Kit Rowan",
          "role": "Cartoon workshop tutor",
          "initials": "KR",
          "statement": "I pinned up children's drawings. I did not touch the serious portraits."
        }
      ],
      "theories": [
        {
          "id": "window-crayon",
          "label": "Drew on the outside of the glazing with washable window crayon"
        },
        {
          "id": "painted-acetate",
          "label": "Slipped a painted transparent sheet between the frame and portrait"
        },
        {
          "id": "presealed-paint",
          "label": "Painted the moustache on the portrait before the backing seals were signed"
        }
      ],
      "clues": [
        {
          "glyph": "✕",
          "tag": "FRAME BACK",
          "title": "Four honest seals",
          "text": "Every backing seal bears matching paper fibres and Mara's continuous signature. No sheet or brush entered from behind after the frame was closed."
        },
        {
          "glyph": "◫",
          "tag": "VIEWING ANGLE",
          "title": "A face that slips sideways",
          "text": "Viewed from the far left, the blue curve shifts a few millimetres away from the painted upper lip. The mark sits on a surface in front of the portrait."
        },
        {
          "glyph": "·",
          "tag": "GLASS EDGE",
          "title": "A blue crumb",
          "text": "A soft cobalt crumb rests against the outer frame lip. It smears under a damp cotton bud while the varnished painting beneath remains untouched."
        },
        {
          "glyph": "≈",
          "tag": "PIGMENT",
          "title": "Made for windows",
          "text": "The mark contains wax, soap, and washable dye rather than artist's oil pigment. It matches the window crayons used in the children's cartoon workshop."
        },
        {
          "glyph": "K",
          "tag": "SUPPLY CARD",
          "title": "Cobalt at the glass",
          "text": "Kit signed out the only cobalt window crayon at 3:08. A 3:24 setup time-lapse shows it in Kit's hand against Mrs. D'Souza's glass while Felix dusts the opposite wall and Mara staffs the lobby. Kit returned it at 3:37 with its tip flattened into the moustache's broad curve."
        }
      ],
      "hints": [
        "Move your viewpoint. If two marks shift relative to one another, they are not on the same plane.",
        "The backing seals protect the painting, but they do not protect the outside face of the glass."
      ],
      "solution": {
        "culpritId": "kit",
        "theoryId": "window-crayon",
        "title": "The joke was only glass-deep.",
        "explanation": "Kit drew the moustache directly on the outside of the glazing with the cartoon workshop's cobalt window crayon. Parallax separates the mark from the painted face, and the washable wax-and-soap pigment confirms that the portrait itself was never defaced. The time-lapse places the signed-out crayon in Kit's hand at the glass while the other suspects are elsewhere, and its newly flattened tip matches the curve.",
        "proof": [
          "Parallax places the mark in front of the painting",
          "The pigment is washable window crayon",
          "The time-lapse shows Kit holding the matching crayon at the glass"
        ]
      }
    },
    {
      "id": "batch-a-lantern-that-would-not-light",
      "caseNumber": 10,
      "title": "The Lantern That Would Not Light",
      "subtitle": "The oil was sound. The wick had been dressed for another job.",
      "location": "Riverside Lantern Festival",
      "incident": "7:05–7:25 PM",
      "difficulty": "Measured",
      "fileMark": "FESTIVAL / SABOTAGE",
      "brief": [
        "The festival's lead lantern passed its afternoon test, yet refused to light when the river procession began at 7:20. Its reservoir was full, the air holes were open, and a fresh-looking wick sat in the burner.",
        "Three volunteers worked around the lantern table after the successful test. One replaced a useful piece of cotton with something that only looked like it."
      ],
      "question": "Who disabled the lead lantern, and what was substituted for its wick?",
      "suspects": [
        {
          "id": "lian",
          "name": "Lian Park",
          "role": "Lantern maker",
          "initials": "LP",
          "statement": "I tested the real wick at four. After that, I only repaired the paper shade."
        },
        {
          "id": "niko",
          "name": "Niko Bell",
          "role": "Procession drummer",
          "initials": "NB",
          "statement": "I tightened my drum in the music tent. I never handled the lantern burners."
        },
        {
          "id": "bea",
          "name": "Bea Moss",
          "role": "Festival beekeeper",
          "initials": "BM",
          "statement": "I left beeswax candles on the table, but wax near a wick is hardly suspicious."
        }
      ],
      "theories": [
        {
          "id": "shellacked-drum-cord",
          "label": "Replaced the cotton wick with shellacked drum cord that could not draw oil"
        },
        {
          "id": "watered-oil",
          "label": "Diluted the reservoir with water so fuel could not reach the flame"
        },
        {
          "id": "blocked-vents",
          "label": "Sealed the air vents with clear wax so the flame suffocated"
        }
      ],
      "clues": [
        {
          "glyph": "◉",
          "tag": "FUEL TEST",
          "title": "Good oil, open air",
          "text": "A spoonful from the reservoir burns cleanly, and a wire passes through every vent. Neither watered fuel nor blocked airflow caused the failure."
        },
        {
          "glyph": "║",
          "tag": "FALSE WICK",
          "title": "Cotton that will not bend",
          "text": "The supposed wick is glossy and rigid. After ten minutes in oil, its core remains dry instead of darkening by capillary action."
        },
        {
          "glyph": "◒",
          "tag": "COATING",
          "title": "Amber at the cut",
          "text": "A cut cross-section reveals cotton cord sealed beneath amber shellac. Beeswax would soften with hand warmth; this coating does not."
        },
        {
          "glyph": "≋",
          "tag": "DRUM BENCH",
          "title": "The red tracer",
          "text": "Niko's drum-repair cord uses the same three-strand braid, amber shellac, and single red tracer thread as the false wick. Twelve centimetres are missing from his spool."
        },
        {
          "glyph": "◈",
          "tag": "GROUP PHOTO",
          "title": "A reflection in brass",
          "text": "A 7:14 group photo—six minutes before the first lighting attempt—reflects Niko beside the burner tray, holding the lantern's brass wick cap. Lian and Bea are visible together across the square."
        }
      ],
      "hints": [
        "A wick must carry fuel as well as resemble cotton. Check whether this one absorbs anything.",
        "The hard amber coating belongs to an instrument-repair material, not to the beekeeper's soft wax."
      ],
      "solution": {
        "culpritId": "niko",
        "theoryId": "shellacked-drum-cord",
        "title": "The false wick was tuned, not woven.",
        "explanation": "Niko removed the tested wick and replaced it with a short length of shellacked drum cord before the 7:20 lighting attempt. The cord looked like braided cotton but its hard coating prevented oil from rising to the flame. Its weave, red tracer, and amber shellac match Niko's missing repair cord exactly, and the 7:14 photograph places the wick cap in his hand during the available interval.",
        "proof": [
          "The fuel and air supply both work",
          "Shellac prevents the false wick from absorbing oil",
          "The matching cord and photograph identify Niko"
        ]
      }
    },
    {
      "id": "batch-a-silver-thimble",
      "caseNumber": 11,
      "title": "The Silver Thimble",
      "subtitle": "The cabinet never opened. Its dust travelled toward the wall.",
      "location": "Rosebank Stitching Room",
      "incident": "Tuesday, 8:00–9:10 AM",
      "difficulty": "Sharp",
      "fileMark": "CRAFT HALL / HEIRLOOM",
      "brief": [
        "Rosebank's engraved centennial thimble vanished from a locked wall cabinet before the quilting circle arrived. The glass door's wax seal was undisturbed, and the nineteen-millimetre thimble was too wide for any eight-millimetre slot in the rear vent's apparently fixed mesh.",
        "Three people entered the stitching room that morning. Each knew the heirloom would be photographed at ten."
      ],
      "question": "Who removed the thimble, and how did it pass mesh slots narrower than the object itself?",
      "suspects": [
        {
          "id": "june",
          "name": "June Alder",
          "role": "Community-hall caretaker",
          "initials": "JA",
          "statement": "I dusted and vacuumed the room. The display cabinet and my vacuum hose were never connected."
        },
        {
          "id": "ruth",
          "name": "Ruth Webb",
          "role": "Quilting-circle chair",
          "initials": "RW",
          "statement": "I arranged fabric beneath the cabinet, then fetched tea before anyone else arrived."
        },
        {
          "id": "leo",
          "name": "Leo Finch",
          "role": "Anniversary photographer",
          "initials": "LF",
          "statement": "I measured the light and unpacked my tripod. I never touched the display."
        }
      ],
      "theories": [
        {
          "id": "vacuum-through-vent",
          "label": "Loosened the vent mesh and used suction to pull the thimble into a vacuum hose"
        },
        {
          "id": "hinge-pin",
          "label": "Removed the cabinet hinge pin and lifted the sealed glass door away as one piece"
        },
        {
          "id": "adhesive-rod",
          "label": "Pushed a sticky rod through the keyhole and drew the thimble to the lock"
        }
      ],
      "clues": [
        {
          "glyph": "✣",
          "tag": "WAX SEAL",
          "title": "The door stayed shut",
          "text": "The wax bridges glass and frame without a crack. Both hinge pins retain old oxidation, and the keyhole's dust is undisturbed."
        },
        {
          "glyph": "⌁",
          "tag": "PLINTH DUST",
          "title": "A curved clean trail",
          "text": "Dust forms a swept arc from the thimble's plinth to the rear vent. A loose red thread from the display points along the same route."
        },
        {
          "glyph": "▦",
          "tag": "VENT MESH",
          "title": "A larger opening behind the slots",
          "text": "Each fixed-looking mesh slot is only eight millimetres wide, but the whole mesh is a removable fifty-five-millimetre cassette. Its two lower clips are freshly bent outward, exposing an aperture wide enough for June's thirty-four-millimetre nozzle."
        },
        {
          "glyph": "◎",
          "tag": "VACUUM HOSE",
          "title": "Felt in the elbow",
          "text": "June's nozzle has a twenty-six-millimetre inner bore, wide enough for the nineteen-millimetre thimble. Red display felt and silver-polish dust coat its interior, and something metallic rattles beyond the hose elbow."
        },
        {
          "glyph": "Ⅲ",
          "tag": "MACHINE METER",
          "title": "Three minutes of suction",
          "text": "The hall vacuum's service meter advanced by three minutes after June signed the room clean. The thimble is lodged behind its hose filter, wrapped harmlessly in red thread."
        }
      ],
      "hints": [
        "The thimble did not need to fit through the fixed mesh if the mesh itself could be moved.",
        "Follow the direction of the dust and thread. Both point toward a tool that moves objects with air."
      ],
      "solution": {
        "culpritId": "june",
        "theoryId": "vacuum-through-vent",
        "title": "The heirloom took a very short vacuum journey.",
        "explanation": "June bent back the vent cassette's lower clips, lifted the whole mesh away from its fifty-five-millimetre aperture, and inserted the vacuum nozzle. Its twenty-six-millimetre bore admitted the nineteen-millimetre thimble, which suction dragged across the felt and into the hose. She then replaced the mesh, leaving the sealed glass door untouched. The dust trail, bent clips, felt inside her nozzle, and thimble behind the hose filter establish one continuous route.",
        "proof": [
          "The cabinet door and keyhole were never disturbed",
          "Dust and thread trace a route to the loosened vent",
          "June's nozzle and hose contain the display traces and thimble"
        ]
      }
    },
    {
      "id": "batch-a-moon-that-tore-itself",
      "caseNumber": 12,
      "title": "The Moon That Tore Itself",
      "subtitle": "The workshop was empty when the scenery began to move.",
      "location": "Juniper Street Theatre Workshop",
      "incident": "4:20–4:35 PM",
      "difficulty": "Sharp",
      "fileMark": "THEATRE / RIGGED DAMAGE",
      "brief": [
        "A hand-painted canvas moon was locked inside the theatre workshop at four. When the director opened the room at 4:35, a fresh tear ran from the moon's lower edge almost to its centre. The numbered door tape was intact.",
        "Three cast members handled the scenery before lockup. The damage happened later, in a room with no person inside but one machine still following its schedule."
      ],
      "question": "Who rigged the tear, and what movement triggered it after the room was locked?",
      "suspects": [
        {
          "id": "priya",
          "name": "Priya Lake",
          "role": "Scenic painter",
          "initials": "PL",
          "statement": "I retouched the moon, photographed the clean canvas, and sealed my paint box before four."
        },
        {
          "id": "milo",
          "name": "Milo Hart",
          "role": "Understudy",
          "initials": "MH",
          "statement": "I returned my coat to wardrobe. I never touched a pulley or the painted moon."
        },
        {
          "id": "ren",
          "name": "Ren Ortiz",
          "role": "Fly-system technician",
          "initials": "RO",
          "statement": "I locked the controls after programming the routine safety cycle. No manual cue ran."
        }
      ],
      "theories": [
        {
          "id": "brooch-on-fly-line",
          "label": "Hooked a sharp costume brooch to the neighbouring fly line so its scheduled movement tore the canvas"
        },
        {
          "id": "drying-paint-split",
          "label": "Applied fast-shrinking paint that pulled the canvas apart as it dried"
        },
        {
          "id": "remote-blade",
          "label": "Hid a clockwork blade behind the moon and timed it to open after lockup"
        }
      ],
      "clues": [
        {
          "glyph": "▯",
          "tag": "DOOR TAPE",
          "title": "An empty workshop",
          "text": "The numbered tape is original and unbroken. A corridor camera shows nobody entering between 4:00 and 4:35, so the damage was prepared before lockup."
        },
        {
          "glyph": "↑",
          "tag": "TEAR DIRECTION",
          "title": "Pulled from behind",
          "text": "Canvas fibres curl toward the audience side while the tear climbs upward. A sharp point caught the back lower edge and was hauled vertically."
        },
        {
          "glyph": "✦",
          "tag": "TRACE",
          "title": "Silver in the fibres",
          "text": "The tear holds the broken point of a steel brooch pin and fine silver stage glitter. There is no blade housing, spring oil, or unusual paint shrinkage."
        },
        {
          "glyph": "☾",
          "tag": "WARDROBE",
          "title": "One crescent on the line",
          "text": "Milo's understudy coat is missing its glittered crescent brooch. The broken crescent body and clasp remain tied to the neighbouring fly line; their snapped pin fits the steel point embedded in the canvas."
        },
        {
          "glyph": "↟",
          "tag": "FLY LOG",
          "title": "The 4:27 safety rise",
          "text": "Priya's timestamped 3:58 photo of the clean canvas reflects Milo behind the moon tying black thread at that line while Ren locks the control cage. At 4:27, the automatic safety cycle raised the same line by eighty centimetres."
        }
      ],
      "hints": [
        "An intact door means the culprit arranged a delayed action before four o'clock.",
        "Match the direction of the tear to the only object in the empty room that moved upward on schedule."
      ],
      "solution": {
        "culpritId": "milo",
        "theoryId": "brooch-on-fly-line",
        "title": "The moon tore on cue.",
        "explanation": "Before lockup, Milo tied his sharp crescent brooch to the neighbouring fly line and hooked its pin into the moon's lower back edge. Priya's 3:58 photo catches him tying the line while Ren locks the controls. The programmed 4:27 safety cycle then raised the line, snapping the brooch pin and dragging its point upward through the canvas while the workshop remained empty. The recovered brooch body, embedded point, photograph, and fly log reconstruct the delayed sabotage.",
        "proof": [
          "The sealed room requires a prepared delayed action",
          "The upward tear follows the scheduled fly-line movement",
          "The 3:58 photograph places Milo rigging the recovered brooch"
        ]
      }
    },
    {
      "id": "batch-a-vanishing-letter-q",
      "caseNumber": 13,
      "title": "The Vanishing Letter Q",
      "subtitle": "The tile bag held a perfect count and one piece that was never wood.",
      "location": "Oak Room Word-Game Final",
      "incident": "2:40–3:05 PM",
      "difficulty": "Measured",
      "fileMark": "GAME HALL / MISSING TILE",
      "brief": [
        "Officials counted one hundred wooden tiles into a canvas bag, weighed it, and sealed the drawstring before the neighbourhood word-game final. When play began, the letter Q was missing. The seal remained intact.",
        "A cup of tea had spilled across the bag while the finalists took their seats. Everyone assumed the damp patch was merely bad luck."
      ],
      "question": "Who made the Q disappear from a sealed bag, and what temporary substitute fooled the count?",
      "suspects": [
        {
          "id": "celia",
          "name": "Celia Crumb",
          "role": "Baker and scorekeeper",
          "initials": "CC",
          "statement": "I brought refreshments and read out the tile count. I never added anything to the bag."
        },
        {
          "id": "owen",
          "name": "Owen Reed",
          "role": "Tournament host",
          "initials": "OR",
          "statement": "I pulled the seal tight myself. The correct weight was written down before the spill."
        },
        {
          "id": "nora",
          "name": "Nora Vale",
          "role": "Library volunteer",
          "initials": "NV",
          "statement": "I fetched score sheets from the next room. The tiles were already on the counting cloth."
        }
      ],
      "theories": [
        {
          "id": "sugar-tile-dissolved",
          "label": "Removed the wooden Q before sealing and replaced it with a hollow painted sugar tile matched to its weight"
        },
        {
          "id": "double-seam-pocket",
          "label": "Worked the Q into a concealed pocket inside the bag's double seam"
        },
        {
          "id": "magnet-under-table",
          "label": "Pulled a metal-backed Q through the canvas with a magnet beneath the table"
        }
      ],
      "clues": [
        {
          "glyph": "100",
          "tag": "COUNT SHEET",
          "title": "A correct count and weight",
          "text": "At 2:44 the bag held one hundred tile-shaped pieces at the expected total weight on the officials' whole-gram scale. The original string seal has not moved since that measurement."
        },
        {
          "glyph": "≈",
          "tag": "DAMP PATCH",
          "title": "Sticky inside, clean outside",
          "text": "The tea dried normally on the outer canvas, but the lining beneath it is tacky and slightly sweet-smelling. The bag seam contains no hidden pocket."
        },
        {
          "glyph": "□",
          "tag": "RESIDUE",
          "title": "An ivory outline",
          "text": "Inside the damp patch lies a tile-sized square of glucose residue with two ivory paint flakes, one curved like the tail of a capital Q."
        },
        {
          "glyph": "Q",
          "tag": "REFEREE PHOTO",
          "title": "One letter too glossy",
          "text": "A photograph taken during the count shows a glossy Q among the matte wooden tiles. Celia's hand is beside it while Owen reaches for the sealing cord."
        },
        {
          "glyph": "▦",
          "tag": "SUGAR MOULD",
          "title": "The missing place card",
          "text": "Celia brought hollow pulled-sugar place cards moulded to the exact tile dimensions. An unused card and a wooden tile both register three grams on the officials' scale. Her tray has an empty Q cavity, and matching ivory food paint dries on her pastry brush."
        }
      ],
      "hints": [
        "The count can be correct even if one counted object is only pretending to be a wooden tile.",
        "The tea did not remove anything through the sealed bag. It changed one water-soluble object already inside."
      ],
      "solution": {
        "culpritId": "celia",
        "theoryId": "sugar-tile-dissolved",
        "title": "The Q was counted, weighed, and then dissolved.",
        "explanation": "Celia pocketed the wooden Q during counting and substituted a hollow painted sugar replica made in her tile-sized place-card mould. Its thin shell matched the wooden tile's three-gram reading, so it supplied the correct shape, count, and measured weight when Owen sealed the bag. Tea soaking through the canvas dissolved the false tile, leaving glucose and ivory food-paint flakes behind. The referee's photograph and Celia's empty Q mould identify the substitution.",
        "proof": [
          "The intact seal means the bag contained the trick from the start",
          "Sugar and Q-shaped paint remain in the damp patch",
          "Celia made a matching sugar piece and handled it during counting"
        ]
      }
    },
    {
      "id": "batch-a-blank-kitchen-clue",
      "caseNumber": 14,
      "title": "The Blank Kitchen Clue",
      "subtitle": "Dinner grew warmer. The handwriting quietly disappeared.",
      "location": "Flat 4B Puzzle Supper",
      "incident": "7:15–7:50 PM",
      "difficulty": "Gentle",
      "fileMark": "HOME / VANISHING INK",
      "brief": [
        "At an apartment puzzle supper, the final handwritten clue was sealed in a clear box above the kitchen warming shelf. Everyone read it at 7:15. When the teams returned at 7:50, the card was blank although the box's paper lock remained intact.",
        "Three organisers prepared the clue station. No one needed to reopen the box to make its message vanish."
      ],
      "question": "Who made the clue disappear, and what ordinary change in the kitchen activated the trick?",
      "suspects": [
        {
          "id": "anika",
          "name": "Anika Shah",
          "role": "Supper host",
          "initials": "AS",
          "statement": "I sealed the box, then switched on the warming shelf when dinner arrived."
        },
        {
          "id": "dev",
          "name": "Dev Linn",
          "role": "Invitation letterer",
          "initials": "DL",
          "statement": "I copied the clue using the permanent black pen Anika left beside the card."
        },
        {
          "id": "mira",
          "name": "Mira Bose",
          "role": "Puzzle setter",
          "initials": "MB",
          "statement": "I wrote the wording, but Dev made the display copy while I checked the answers."
        }
      ],
      "theories": [
        {
          "id": "heat-erasable-ink",
          "label": "Lettered the card in heat-erasable ink that turned clear above the warming shelf"
        },
        {
          "id": "sliding-white-sheet",
          "label": "Rigged a white sheet inside the frame to slide over the writing as the box warmed"
        },
        {
          "id": "cleaning-vapour",
          "label": "Placed a hidden cleaning capsule in the box whose vapour bleached ordinary ink"
        }
      ],
      "clues": [
        {
          "glyph": "✕",
          "tag": "PAPER LOCK",
          "title": "Still sealed, still simple",
          "text": "The paper lock and clear box are intact. Inside are only one card and two clips—no sliding sheet, capsule, thread, or mechanical part."
        },
        {
          "glyph": "✎",
          "tag": "CARD SURFACE",
          "title": "Words without colour",
          "text": "Side lighting reveals pen-pressure grooves spelling the original clue. The card was genuinely written on; the coloured ink alone became invisible."
        },
        {
          "glyph": "54°",
          "tag": "THERMOMETER",
          "title": "A warm little shelf",
          "text": "After Anika switched it on, air around the clue box reached 54°C. Ordinary permanent ink remains black at that temperature."
        },
        {
          "glyph": "❄",
          "tag": "COLD TEST",
          "title": "The letters return",
          "text": "Held against a freezer pack, the card's dark violet words slowly reappear. Reversible heat-erasing ink can regain colour when chilled."
        },
        {
          "glyph": "DL",
          "tag": "PEN CASE",
          "title": "The switched cap",
          "text": "Dev's lettering case contains a violet heat-erasable tailoring pen fitted with the black cap from Anika's permanent marker. The permanent pen is in his case under Dev's violet cap."
        }
      ],
      "hints": [
        "The grooves prove the words were not covered or removed. Only their colour changed.",
        "Compare what happened near the warming shelf with what happens when the card is chilled again."
      ],
      "solution": {
        "culpritId": "dev",
        "theoryId": "heat-erasable-ink",
        "title": "The kitchen erased the clue on schedule.",
        "explanation": "Dev switched pen caps and lettered the card with his violet heat-erasable tailoring pen while claiming to use Anika's permanent marker. Once the warming shelf raised the box to 54°C, the ink turned clear without anyone breaking the seal. The pressure grooves show the message was written, the freezer pack restores it, and the exchanged caps tie the deliberate substitution to Dev.",
        "proof": [
          "The intact, empty mechanism rules out a physical cover",
          "Heat erased the colour and cold restored it",
          "Dev's switched pen caps reveal the deliberate ink swap"
        ]
      }
    },
    {
      "id": "batch-b-cat-patch",
      "caseNumber": 15,
      "title": "The Cat Patch",
      "subtitle": "At nine sharp, six work computers grew whiskers. The company servers did not.",
      "location": "Northstar Support Academy",
      "incident": "Monday, 8:39–9:02 AM",
      "difficulty": "Gentle",
      "fileMark": "SOFTWARE / PRANK",
      "brief": [
        "At the start of a customer-service exam, every computer in Northstar's training room replaced the company logo with a cat and changed each HELP button to HISS. Public users and the rest of the office saw the normal website.",
        "The code repository, deployment history, and company servers were untouched. Someone changed what six browsers displayed without changing the website itself."
      ],
      "question": "Who released the cat patch, and how did six computers change without a website deployment?",
      "suspects": [
        {
          "id": "omar",
          "name": "Omar Kaye",
          "role": "Front-end developer",
          "initials": "OK",
          "statement": "It looks like my kind of joke, but my code never left review. Check the servers."
        },
        {
          "id": "tessa",
          "name": "Tessa Quill",
          "role": "Support trainer",
          "initials": "TQ",
          "statement": "I reached the academy after nine. The cats were already all over the screens."
        },
        {
          "id": "len",
          "name": "Len Park",
          "role": "IT administrator",
          "initials": "LP",
          "statement": "I reset the training profile on Friday. I installed no software this morning."
        }
      ],
      "theories": [
        {
          "id": "local-extension",
          "label": "Added a locally hosted browser extension to the managed training-device group, rewriting the page only on those six computers"
        },
        {
          "id": "cached-beta",
          "label": "Sent the computers to an abandoned beta website through a stale network cache"
        },
        {
          "id": "server-patch",
          "label": "Briefly deployed altered website code, then erased the release history"
        }
      ],
      "clues": [
        {
          "glyph": "☁",
          "tag": "SERVER CAPTURE",
          "title": "The website stayed serious",
          "text": "A network capture from an affected computer shows Northstar's server returning the ordinary logo and the word HELP. The cat artwork appeared only after the browser received the page."
        },
        {
          "glyph": "▦",
          "tag": "ROOM CHECK",
          "title": "Six of six, and nowhere else",
          "text": "Only the academy's six computers were affected. They belong to one centrally managed browser group; phones and laptops on the same room network displayed the normal site."
        },
        {
          "glyph": "⊞",
          "tag": "EXTENSION LIST",
          "title": "Purr-fect Support Tools",
          "text": "The six-device training group received a locally hosted extension package at 8:47. Its rules replace Northstar's logo, HELP labels, and notification sound with the exact cat versions witnesses saw."
        },
        {
          "glyph": "▣",
          "tag": "INSTALL RECORD",
          "title": "A trainer's local session",
          "text": "The management audit shows Tessa's trainer account uploaded CAT-PATCH.crx from a drive named TQ-TRAINING-KIT and assigned it to the training group. Omar and Len's accounts have no academy-management session that morning."
        },
        {
          "glyph": "↥",
          "tag": "BADGE LOG",
          "title": "Twenty-one early minutes",
          "text": "Tessa's badge opened the academy at 8:39, not after nine as she claimed. Camera footage shows her leaving computer six at 8:49 with her training USB in hand."
        }
      ],
      "hints": [
        "Separate the website sent by the server from the version assembled by each browser.",
        "Ask what the six affected computers share that nearby phones and laptops do not."
      ],
      "solution": {
        "culpritId": "tessa",
        "theoryId": "local-extension",
        "title": "The patch lived in the browser, not the product.",
        "explanation": "Tessa arrived early, signed into the academy's browser-management console, and uploaded her cat-themed extension package from TQ-TRAINING-KIT. She assigned it to the six-device training group, whose browsers installed it by managed policy and rewrote the normal page after it arrived from Northstar's unchanged server. The management audit, her signed-in session, and her 8:39 badge entry make the prank uniquely hers.",
        "proof": [
          "The server delivered the unaltered website",
          "All affected computers belonged to one managed browser group",
          "Tessa's session assigned the matching extension package"
        ]
      }
    },
    {
      "id": "batch-b-unscheduled-slide",
      "caseNumber": 16,
      "title": "The Unscheduled Slide",
      "subtitle": "The display had no signal, yet it showed the company's best-kept secret.",
      "location": "Halcyon Tower, Meeting Room 12",
      "incident": "Tuesday, 7:45–8:01 AM",
      "difficulty": "Measured",
      "fileMark": "OFFICE / DISCLOSURE",
      "brief": [
        "At 7:58, a conference-room display flashed a confidential acquisition slide for twelve seconds while visiting caterers worked in the corridor. No presentation computer was connected, and the slide had not been scheduled for the room.",
        "The screen then returned to its harmless blue welcome mark. Three people had been near Room 12 before the visitors arrived."
      ],
      "question": "Who exposed the acquisition slide, and how did it appear on a screen with no presentation signal?",
      "suspects": [
        {
          "id": "mira",
          "name": "Mira Voss",
          "role": "Audio-visual technician",
          "initials": "MV",
          "statement": "I tested the cable at 7:45. I neither restarted the display nor changed its welcome screen."
        },
        {
          "id": "priya",
          "name": "Priya Sen",
          "role": "Finance analyst",
          "initials": "PS",
          "statement": "I brought the slide deck upstairs, but it stayed encrypted on my laptop."
        },
        {
          "id": "jonah",
          "name": "Jonah Reed",
          "role": "Catering supervisor",
          "initials": "JR",
          "statement": "My crew reached the corridor at 7:56. We never entered the locked room."
        }
      ],
      "theories": [
        {
          "id": "boot-image",
          "label": "Replaced the display's local boot image and restarted it with a service remote"
        },
        {
          "id": "wireless-cast",
          "label": "Cast the slide from a nearby laptop, then disconnected before anyone entered"
        },
        {
          "id": "signage-schedule",
          "label": "Inserted the slide into the building's central signage schedule"
        }
      ],
      "clues": [
        {
          "glyph": "□",
          "tag": "INPUT LOG",
          "title": "No source attached",
          "text": "The display recorded NO INPUT from 7:40 until 8:16. A wireless cast or connected laptop would have created a named input event."
        },
        {
          "glyph": "⌘",
          "tag": "SIGNAGE SERVER",
          "title": "Room 12 is off the list",
          "text": "The building's signage server controls lobby screens only. Room 12's display has never enrolled, and the server logged no new media or schedule that morning."
        },
        {
          "glyph": "↻",
          "tag": "UPTIME",
          "title": "A restart at 7:58",
          "text": "The display's internal clock reset at exactly 7:58. Its manual says a custom boot image appears for twelve seconds whenever the unit restarts without an input."
        },
        {
          "glyph": "▤",
          "tag": "SERVICE HISTORY",
          "title": "Welcome became confidential",
          "text": "At 7:51, a maintenance USB replaced welcome.png with a pixel-for-pixel copy of the acquisition slide. The USB serial is AV-14, assigned to Mira's toolkit."
        },
        {
          "glyph": "◉",
          "tag": "REMOTE REGISTER",
          "title": "One authorised restart",
          "text": "Mira signed out Room 12's service remote at 7:43 and returned it at 8:04. Priya's laptop remained encrypted in the finance safe until 8:10, and Jonah never crossed the room's badge-controlled door."
        }
      ],
      "hints": [
        "A screen can display its own image even when it receives no presentation signal.",
        "The twelve-second duration is not random; compare it with the display manual and uptime log."
      ],
      "solution": {
        "culpritId": "mira",
        "theoryId": "boot-image",
        "title": "The secret was disguised as a welcome.",
        "explanation": "Mira used her AV-14 maintenance USB to replace the display's local boot image with the acquisition slide, then restarted the screen at 7:58 using its service remote. With no input attached, the display showed that image for its standard twelve-second boot interval. The USB serial and remote register give Mira both the preparation and the trigger, while the uptime log contradicts her denial.",
        "proof": [
          "No wired or wireless input was active",
          "The slide replaced the display's local boot image",
          "Mira controlled both the matching USB and service remote"
        ]
      }
    },
    {
      "id": "batch-b-last-library-scan",
      "caseNumber": 17,
      "title": "The Last Library Scan",
      "subtitle": "The atlas left the shelf. Its electronic name stayed behind.",
      "location": "Bellwether Public Library",
      "incident": "Wednesday, 4:35–5:12 PM",
      "difficulty": "Measured",
      "fileMark": "LIBRARY / RFID",
      "brief": [
        "A rare illustrated street atlas vanished from the local-history room. The exit gates never alarmed, and the catalogue still placed the atlas inside the building after closing.",
        "A cataloguer, a researcher, and a shelving volunteer handled books near the room. Someone separated the atlas from the electronic identity meant to protect it."
      ],
      "question": "Who removed the atlas, and how were the library's RFID gates fooled?",
      "suspects": [
        {
          "id": "rina",
          "name": "Rina Holt",
          "role": "Rare-books cataloguer",
          "initials": "RH",
          "statement": "I measured the atlas, returned it to its cradle, and spent the next hour at the front desk."
        },
        {
          "id": "jules",
          "name": "Jules Amani",
          "role": "Local-history researcher",
          "initials": "JA",
          "statement": "I requested the atlas but was refused. I left with my own notebook and nothing else."
        },
        {
          "id": "theo",
          "name": "Theo Pell",
          "role": "Shelving volunteer",
          "initials": "TP",
          "statement": "My cart held only ordinary returns and withdrawn paperbacks. I never touched the atlas."
        }
      ],
      "theories": [
        {
          "id": "rfid-swap",
          "label": "Moved the atlas's active RFID strip into an ordinary book and gave the atlas a deactivated discard strip"
        },
        {
          "id": "foil-sleeve",
          "label": "Wrapped the atlas in metallic material to block its tag at the exit gates"
        },
        {
          "id": "return-chute",
          "label": "Dropped the atlas through the internal return conveyor and collected it outside"
        }
      ],
      "clues": [
        {
          "glyph": "⌁",
          "tag": "GATE LOG",
          "title": "No shielded object",
          "text": "At 5:08, the gates recorded the ordinary books on Theo's discard cart as it crossed into the collection vestibule beyond the secure exit. They saw neither the atlas tag nor the interference pattern made by a foil-shielded book."
        },
        {
          "glyph": "⌖",
          "tag": "SHELF SCANNER",
          "title": "An atlas among the gardens",
          "text": "After closing, the handheld scanner located the atlas's RFID number inside The Pocket Garden, an ordinary book two aisles from local history."
        },
        {
          "glyph": "▥",
          "tag": "ENDPAPER",
          "title": "A newly hidden strip",
          "text": "The Pocket Garden's rear endpaper has been freshly lifted and reglued. Beneath it sits the atlas's active RFID strip, still carrying fibres from its cream mounting paper."
        },
        {
          "glyph": "⊘",
          "tag": "DISCARD LIST",
          "title": "One dead tag missing",
          "text": "A withdrawn paperback on Theo's cart is missing its deactivated RFID strip. A manual reader detects that strip inside the atlas, which is concealed beneath the cart's false cardboard bottom in the vestibule beyond the gates."
        },
        {
          "glyph": "▰",
          "tag": "DESK CAMERA",
          "title": "The cart had one keeper",
          "text": "Rina remained continuously at the staffed desk, and Jules left through the gates carrying a transparent document wallet. Theo alone handled the discard cart, added its false bottom at 4:41, and pushed it through the gates at 5:08."
        }
      ],
      "hints": [
        "The catalogue tracks a radio tag, not the physical book around it.",
        "Find both halves of the exchange: where the active atlas tag stayed and where a deactivated tag went."
      ],
      "solution": {
        "culpritId": "theo",
        "theoryId": "rfid-swap",
        "title": "He shelved the atlas's name and moved the book.",
        "explanation": "Theo peeled the atlas's active RFID strip away and hid it inside The Pocket Garden, leaving the catalogue convinced the atlas remained in the library. He transferred a deactivated strip from a withdrawn paperback into the atlas, hid the atlas under his discard cart's false bottom, and pushed the cart through the gates into the collection vestibule. The paired tag locations, silent gate crossing, and Theo's exclusive control of the altered cart prove the swap.",
        "proof": [
          "The atlas's active tag remained in an ordinary shelf book",
          "A discard's deactivated tag was placed in the atlas",
          "Theo alone pushed the altered cart and hidden atlas through the gates"
        ]
      }
    },
    {
      "id": "batch-b-bus-that-never-cancelled",
      "caseNumber": 18,
      "title": "The Bus That Never Cancelled",
      "subtitle": "The route kept running. One lonely sign insisted otherwise.",
      "location": "Cedar Square Bus Stop",
      "incident": "Friday, 5:16–5:31 PM",
      "difficulty": "Gentle",
      "fileMark": "TRANSIT / FALSE NOTICE",
      "brief": [
        "At rush hour, Cedar Square's digital sign announced ROUTE 6 CANCELLED and sent dozens of passengers walking to another stop. Route 6 was running normally, and every other sign showed it two minutes away.",
        "Transit control says it never sent the cancellation. The false message appeared only at Cedar Square and vanished after an inspector opened the sign cabinet and completed a standard connectivity check."
      ],
      "question": "Who posted the false cancellation, and how was one public sign separated from the live transit system?",
      "suspects": [
        {
          "id": "dev",
          "name": "Dev Batra",
          "role": "Transit dispatcher",
          "initials": "DB",
          "statement": "The control feed showed Route 6 on time. I sent no cancellation to any stop."
        },
        {
          "id": "lio",
          "name": "Lio March",
          "role": "Street-poster artist",
          "initials": "LM",
          "statement": "I pasted a concert notice beside the shelter. I never touched the electronic sign."
        },
        {
          "id": "quinn",
          "name": "Quinn Hale",
          "role": "Sign maintenance contractor",
          "initials": "QH",
          "statement": "I inspected Cedar Square yesterday. Today I was across town and the cabinet remained sealed."
        }
      ],
      "theories": [
        {
          "id": "offline-slide",
          "label": "Disconnected the live feed and left a false maintenance slide on a USB inside the sign controller"
        },
        {
          "id": "dispatch-message",
          "label": "Sent a targeted cancellation through the central transit-control system"
        },
        {
          "id": "projected-overlay",
          "label": "Projected convincing letters onto the sign's glass from a nearby building"
        }
      ],
      "clues": [
        {
          "glyph": "≋",
          "tag": "CONTROL FEED",
          "title": "The buses were still speaking",
          "text": "Transit control's signed message history shows only ROUTE 6 — 2 MIN for Cedar Square. Neighboring signs received the same correct feed throughout the incident."
        },
        {
          "glyph": "▦",
          "tag": "PIXEL PHOTO",
          "title": "Light from inside",
          "text": "A passenger's close photograph shows each false letter aligned perfectly to the sign's own amber pixel grid. Nothing was projected onto the outer glass."
        },
        {
          "glyph": "⌁",
          "tag": "CABINET",
          "title": "Live cable, quietly unlatched",
          "text": "The sign's network plug was unclipped inside the locked cabinet. When disconnected, this model automatically loops a maintenance slide stored on its service USB."
        },
        {
          "glyph": "QC",
          "tag": "FALSE SLIDE",
          "title": "A forgotten test footer",
          "text": "Magnification reveals tiny text below CANCELLED: QC TEST 4. The same footer appears on test slides in Quinn's contractor manual, but not in transit-control templates."
        },
        {
          "glyph": "△",
          "tag": "SERVICE KEY",
          "title": "The seal tells on its cutter",
          "text": "The cabinet seal was sliced beneath its fold and restuck with orange service wax. Quinn signed out the only triangular cabinet key that morning; matching orange wax is pressed into its teeth."
        }
      ],
      "hints": [
        "If central control stayed correct and every other sign agreed, investigate what this one sign can display by itself.",
        "The tiny QC footer identifies the source of the false message more reliably than the large words do."
      ],
      "solution": {
        "culpritId": "quinn",
        "theoryId": "offline-slide",
        "title": "One unplugged cable cancelled an imaginary bus.",
        "explanation": "Quinn opened the cabinet with his triangular service key, disconnected the network cable, and inserted a USB whose offline maintenance slide falsely said ROUTE 6 CANCELLED. The sign looped that local slide until the inspector restored its connection. The contractor-only QC footer and orange wax embedded in Quinn's key identify both his file and his access.",
        "proof": [
          "The central transit feed never carried a cancellation",
          "The isolated sign looped a local USB slide",
          "Quinn's key and template link him to the cabinet and message"
        ]
      }
    },
    {
      "id": "batch-b-whiteboard-memory",
      "caseNumber": 19,
      "title": "The Whiteboard's Memory",
      "subtitle": "Everyone surrendered their phone. The wall sent the secret anyway.",
      "location": "Kestrel Design Studio, Blue Room",
      "incident": "Thursday, 2:00–2:38 PM",
      "difficulty": "Sharp",
      "fileMark": "WORKPLACE / LEAK",
      "brief": [
        "A rival agency's proposal contains Kestrel's secret campaign line—including the presenter's crossed-out misspelling. The phrase existed only as handwriting on the Blue Room's smart whiteboard during a closed pitch.",
        "All phones were sealed in a locker, the room camera shows no one photographing the board, and the wall was erased before anyone left."
      ],
      "question": "Who leaked the campaign line, and how did it leave a phone-free room after the board was erased?",
      "suspects": [
        {
          "id": "carlo",
          "name": "Carlo Wynn",
          "role": "Campaign designer",
          "initials": "CW",
          "statement": "I wrote the line, corrected one letter, and never touched the board controls."
        },
        {
          "id": "nessa",
          "name": "Nessa Bell",
          "role": "Pitch facilitator",
          "initials": "NB",
          "statement": "I pressed ERASE when the pitch ended. I saved or sent nothing."
        },
        {
          "id": "mina",
          "name": "Mina Shore",
          "role": "Client observer",
          "initials": "MS",
          "statement": "My phone stayed sealed. I took only the printed agenda I was given."
        }
      ],
      "theories": [
        {
          "id": "board-export",
          "label": "Used the whiteboard's Quick Send feature to email a layered PDF before erasing the wall"
        },
        {
          "id": "hidden-camera",
          "label": "Concealed a tiny camera in the room and photographed the finished board"
        },
        {
          "id": "display-mirror",
          "label": "Mirrored the board live to a computer outside the meeting room"
        }
      ],
      "clues": [
        {
          "glyph": "✎",
          "tag": "RIVAL FILE",
          "title": "Even the mistake survived",
          "text": "The rival PDF contains the crossed-out first spelling as a pale vector layer beneath the corrected word. A normal photograph would flatten both into one image."
        },
        {
          "glyph": "◉",
          "tag": "ROOM CAMERA",
          "title": "No lens, no receiver",
          "text": "Continuous footage accounts for every object and person. No device faced the board, and the room's wireless-mirroring receiver remained powered off."
        },
        {
          "glyph": "↗",
          "tag": "BOARD AUDIT",
          "title": "Send, then erase",
          "text": "At 2:36:14, the board created a layered PDF and used QUICK SEND — SLOT 3. ERASE followed nineteen seconds later."
        },
        {
          "glyph": "@",
          "tag": "QUICK SEND",
          "title": "A friendly name for an outside address",
          "text": "Slot 3 is labelled PROJECT ARCHIVE, but its hidden address is an external mailbox registered to Nessa's freelance portfolio account."
        },
        {
          "glyph": "⌨",
          "tag": "TOUCH LOG",
          "title": "Three deliberate taps",
          "text": "The board records Nessa's facilitator PIN, then the sequence EXPORT, SLOT 3, SEND. Carlo never knew the PIN; Mina was visible across the room while Nessa stood at the controls."
        }
      ],
      "hints": [
        "The crossed-out word remains a separate layer, which tells you more than the visible phrase itself.",
        "Erase was not the only control used at 2:36; follow the board's action sequence and saved recipient."
      ],
      "solution": {
        "culpritId": "nessa",
        "theoryId": "board-export",
        "title": "The wall mailed its memory before forgetting.",
        "explanation": "Nessa unlocked the smart whiteboard with her facilitator PIN, exported its layered writing history, and sent the PDF to her outside mailbox through disguised Quick Send slot 3. She erased the board nineteen seconds later and described only that final action. The rival's editable crossed-out layer, the audit sequence, and Nessa's registered recipient address prove the digital export.",
        "proof": [
          "The leaked file preserves editable whiteboard layers",
          "The board exported to slot 3 immediately before erasure",
          "That external slot and the authorising PIN belong to Nessa"
        ]
      }
    },
    {
      "id": "batch-b-empty-bike-dock",
      "caseNumber": 20,
      "title": "The Occupied Empty Dock",
      "subtitle": "Bay twelve reported a bicycle all afternoon. Anyone could see it was empty.",
      "location": "Riverside Community Bike Station",
      "incident": "Saturday, 12:06–12:19 PM",
      "difficulty": "Sharp",
      "fileMark": "CIVIC BIKE / SENSOR",
      "brief": [
        "A gold-painted community bicycle disappeared from bay twelve during a street fair. The rental system insisted the bike remained locked there, so no missing-bike alert was raised for four hours.",
        "The station camera shows no rider leaving on the gold bicycle. A courier, a repair volunteer, and a dock technician were beside bay twelve shortly before it became visibly empty."
      ],
      "question": "Who removed the bicycle, and how was an empty dock made to report that it was occupied?",
      "suspects": [
        {
          "id": "malik",
          "name": "Malik Snow",
          "role": "Parcel cyclist",
          "initials": "MS",
          "statement": "I parked my own bike beside the station for one delivery. I never unlocked a community bike."
        },
        {
          "id": "fern",
          "name": "Fern Ibarra",
          "role": "Repair-tent volunteer",
          "initials": "FI",
          "statement": "I tightened the gold bike's bell at noon, then returned to the fair tent."
        },
        {
          "id": "arden",
          "name": "Arden Pike",
          "role": "Dock systems technician",
          "initials": "AP",
          "statement": "My van passed Riverside, but I did not stop. The station needed no service."
        }
      ],
      "theories": [
        {
          "id": "calibration-tongue",
          "label": "Released the bike in service mode and inserted a calibration tongue that kept the dock's latch sensor closed"
        },
        {
          "id": "database-ghost",
          "label": "Altered the central rental database to invent an occupied bay after removing the bike"
        },
        {
          "id": "painted-decoy",
          "label": "Exchanged the gold bicycle for a similar bike that was later moved during the fair"
        }
      ],
      "clues": [
        {
          "glyph": "12",
          "tag": "BAY STATUS",
          "title": "Occupied without any weight",
          "text": "Bay twelve has no weight sensor. It reports OCCUPIED whenever a small switch inside its locking jaw is held closed by a bicycle's steel docking tab."
        },
        {
          "glyph": "▰",
          "tag": "LOCKING JAW",
          "title": "A bicycle reduced to one part",
          "text": "Inside the empty jaw is a narrow greased steel tongue. It presses the occupancy switch exactly as a real docking tab would."
        },
        {
          "glyph": "⚒",
          "tag": "LOCAL CONSOLE",
          "title": "Service release at 12:08",
          "text": "The dock recorded a keyed maintenance release at 12:08 and no customer rental. The central database received the false occupied signal but issued no command itself."
        },
        {
          "glyph": "△",
          "tag": "CALIBRATION KIT",
          "title": "Tool B12 is absent",
          "text": "Technicians use numbered steel tongues to test dock switches. B12 is missing from Arden's signed kit, and its unusual three-notch edge matches the tongue inside bay twelve."
        },
        {
          "glyph": "▣",
          "tag": "SERVICE VAN",
          "title": "Gold beneath the blanket",
          "text": "Traffic video shows Arden's van stopped behind the station from 12:06 to 12:12. A search finds fresh gold paint on its internal bike rack; Malik's delivery scan and Fern's fair livestream place both away at 12:08."
        }
      ],
      "hints": [
        "The system does not see a whole bicycle. Discover the single condition it calls occupied.",
        "A normal renter could release a bike, but only one suspect carried the part that could keep the empty latch closed."
      ],
      "solution": {
        "culpritId": "arden",
        "theoryId": "calibration-tongue",
        "title": "The dock counted a sliver of steel as a bicycle.",
        "explanation": "Arden stopped his van, used the technician key to release the gold bike, and loaded it onto his internal rack. He inserted calibration tongue B12 into the empty locking jaw, holding its occupancy switch closed and preventing an alert. The local service release, missing numbered tool, and gold paint inside his van identify both culprit and method.",
        "proof": [
          "A calibration tongue held the dock's simple occupancy switch",
          "Arden's key made the unbilled service release",
          "His missing tool and van physically link him to the removal"
        ]
      }
    },
    {
      "id": "batch-b-robots-wrong-turn",
      "caseNumber": 21,
      "title": "The Robot's Wrong Turn",
      "subtitle": "The delivery order said Studio A. A square sticker quietly disagreed.",
      "location": "Lumen Works Design Campus",
      "incident": "Monday, 2:11–2:19 PM",
      "difficulty": "Sharp",
      "fileMark": "ROBOTICS / DIVERSION",
      "brief": [
        "A delivery robot carrying a sealed prototype should have travelled from reception to Studio A. Instead, it turned into a service corridor and arrived empty at its charging dock seven minutes later.",
        "The manifest remained correct, the parcel seal was intact when recovered, and the robot received no remote reroute command. Someone changed what the robot believed about one hallway junction."
      ],
      "question": "Who diverted the delivery robot, and what made it choose the wrong corridor without a remote command?",
      "suspects": [
        {
          "id": "kian",
          "name": "Kian Moss",
          "role": "Robotics engineer",
          "initials": "KM",
          "statement": "I monitored the fleet console. Nobody changed the route, remotely or otherwise."
        },
        {
          "id": "amba",
          "name": "Amba Grey",
          "role": "Reception courier",
          "initials": "AG",
          "statement": "I scanned the Studio A label, sealed the lid, and watched the robot start correctly."
        },
        {
          "id": "suri",
          "name": "Suri Vale",
          "role": "Studio B designer",
          "initials": "SV",
          "statement": "I was printing sample labels in Studio B. I never went near the robot or its route markers."
        }
      ],
      "theories": [
        {
          "id": "false-marker",
          "label": "Covered a hallway navigation marker with a printed substitute that falsely identified Studio B's alcove as the Studio A destination"
        },
        {
          "id": "remote-reroute",
          "label": "Sent a hidden route command through the robot fleet console"
        },
        {
          "id": "label-swap",
          "label": "Replaced the parcel's Studio A address label before the robot left reception"
        }
      ],
      "clues": [
        {
          "glyph": "A",
          "tag": "PARCEL SCAN",
          "title": "The destination stayed correct",
          "text": "The robot scanned STUDIO A at reception and again at recovery. The numbered parcel seal and adhesive edges are continuous, ruling out a label exchange."
        },
        {
          "glyph": "⌁",
          "tag": "FLEET LOG",
          "title": "No one touched the route",
          "text": "The signed fleet log contains no command after departure. The robot changed direction locally at Junction 4 while following its unchanged Studio A route."
        },
        {
          "glyph": "▦",
          "tag": "ROBOT CAMERA",
          "title": "One square over another",
          "text": "A camera frame shows a fresh black-and-white navigation marker taped over Junction 4's permanent marker. Its code falsely identifies the service corridor as STUDIO A — DELIVERY ALCOVE, so the robot treats the wrong alcove as its unchanged destination."
        },
        {
          "glyph": "·",
          "tag": "PRINT DEFECT",
          "title": "The missing lower-right dot",
          "text": "The false marker lacks one tiny lower-right printer dot. Studio B's label printer has the same blocked nozzle; no other campus printer shares the defect."
        },
        {
          "glyph": "▣",
          "tag": "ACCESS RECORD",
          "title": "Print, intercept, conceal",
          "text": "Studio B's printer logged the marker under Suri's PIN at 2:11. Her badge opened the delivery alcove at 2:16 and the sample cabinet at 2:17, where the still-sealed prototype was recovered."
        }
      ],
      "hints": [
        "The delivery label told the truth and the fleet console stayed quiet, so look at the robot's local view of the building.",
        "A printed navigation marker is also a printed object; inspect it for the signature of its machine."
      ],
      "solution": {
        "culpritId": "suri",
        "theoryId": "false-marker",
        "title": "The robot obeyed a counterfeit landmark.",
        "explanation": "Suri printed a false navigation marker in Studio B and taped it over Junction 4's real marker. The counterfeit code labelled Studio B's alcove as the Studio A destination, so the robot completed its unchanged route at the wrong physical location. Suri removed the still-sealed parcel before the robot continued to its dock. The missing printer dot, her PIN, and her timed alcove access trace the entire diversion to her.",
        "proof": [
          "The parcel label and remote route never changed",
          "A counterfeit marker redirected the robot locally",
          "The marker's printer defect and access trail identify Suri"
        ]
      }
    },
    {
      "id": "batch-c-northbound-atlas",
      "caseNumber": 22,
      "title": "The Northbound Atlas",
      "subtitle": "One dark tunnel. One locked display. A ticket that travelled without a train.",
      "location": "The Aurora Limited, Observation Car",
      "incident": "9:06–9:08 PM",
      "difficulty": "Measured",
      "fileMark": "RAIL / ARCHIVE",
      "brief": [
        "The Aurora Limited carried a tiny travelling exhibition about the first survey of its mountain route. Its prize was the surveyor's signed paper ticket, mounted on a steel conservation card inside a locked tabletop case.",
        "During a two-minute tunnel crossing, the carriage lights dimmed. When they returned, the ticket and its backing card were gone. The lid lock and its paper inspection seal were untouched."
      ],
      "question": "Who took the surveyor's ticket, and how did it leave the locked display?",
      "suspects": [
        {
          "id": "mara-quill",
          "name": "Mara Quill",
          "role": "Railway archivist",
          "initials": "MQ",
          "statement": "I watched the humidity dial from the aisle. I did not put a hand on the case."
        },
        {
          "id": "leo-voss",
          "name": "Leo Voss",
          "role": "Travel photographer",
          "initials": "LV",
          "statement": "My monopod stayed folded in my luggage. I held my camera with both hands through the tunnel."
        },
        {
          "id": "dev-arun",
          "name": "Dev Arun",
          "role": "Dining-car steward",
          "initials": "DA",
          "statement": "I counted the empty tea cups by touch until the carriage lights returned."
        }
      ],
      "theories": [
        {
          "id": "magnetic-monopod",
          "label": "Dragged the steel backing card through the humidity slot with a magnet hidden in a monopod foot"
        },
        {
          "id": "copied-frame-key",
          "label": "Opened the display with a copied key, then carefully replaced the inspection seal"
        },
        {
          "id": "window-paper-roll",
          "label": "Rolled the ticket tightly and drew it out through the observation window gasket"
        }
      ],
      "clues": [
        {
          "glyph": "▣",
          "tag": "DISPLAY",
          "title": "A seal without a wrinkle",
          "text": "The lid's paper inspection seal is continuous under magnification, and the lock contains no fresh marks. The case was not opened from above."
        },
        {
          "glyph": "↔",
          "tag": "CASE PLAN",
          "title": "The narrow way out",
          "text": "A four-millimetre humidity-service slot runs across the rear of the case. The thin ticket and its steel conservation card fit through it together; the closed window gasket does not admit even the bare ticket."
        },
        {
          "glyph": "≋",
          "tag": "FELT LINING",
          "title": "Two tracks to the rear",
          "text": "Fresh parallel scratches cross the felt from the ticket's former position to the humidity slot. The steel card was pulled flat across the case rather than lifted."
        },
        {
          "glyph": "⊕",
          "tag": "CAMERA GEAR",
          "title": "A foot with a strong attraction",
          "text": "Leo's monopod has a powerful retrieval magnet beneath its rubber foot. Blue fibres from the display lining and a fresh steel shaving cling to its edge."
        },
        {
          "glyph": "▧",
          "tag": "PASSENGER PHOTO",
          "title": "One hand too many",
          "text": "A passenger's tunnel photograph catches Leo's camera hanging from its neck strap while his right hand extends the monopod across the rear of the display. His claim that it stayed in his luggage is false."
        }
      ],
      "hints": [
        "Treat the intact lid as a boundary, then look for a route sized for the ticket and its backing card.",
        "The steel card can be moved without fingers. Compare the scratches with Leo's equipment and statement."
      ],
      "solution": {
        "culpritId": "leo-voss",
        "theoryId": "magnetic-monopod",
        "title": "The ticket followed a magnetic route.",
        "explanation": "Leo extended the magnetic foot of his monopod over the case, caught the ticket's steel conservation card through the glass, and dragged it across the felt to the rear humidity slot. He collected the card as it emerged, all without opening the sealed lid. The scratches establish the route, the fibres and steel shaving tie it to his monopod, and the passenger photograph breaks his alibi.",
        "proof": [
          "The intact seal rules out opening the display",
          "The steel card and scratch trail lead to the humidity slot",
          "Leo's magnetic monopod carries the trace and appears in use"
        ]
      }
    },
    {
      "id": "batch-c-falcon-seal",
      "caseNumber": 23,
      "title": "The Falcon Behind the Seal",
      "subtitle": "The wax stayed whole. The ancient amulet did not stay put.",
      "location": "Briar Museum, Egyptian Loan Gallery",
      "incident": "3:40–3:53 PM",
      "difficulty": "Gentle",
      "fileMark": "HISTORY / MUSEUM",
      "brief": [
        "A glazed falcon amulet arrived in a cedar loan chest for a private museum preview. The front hasp was tied shut and stamped with the lender's red wax seal before three specialists entered the gallery.",
        "Thirteen minutes later, the amulet was missing. The cord still crossed the hasp, the seal remained genuine and unbroken, and the chest appeared to have stayed on its marked table."
      ],
      "question": "Who removed the falcon amulet, and how was the sealed chest opened?",
      "suspects": [
        {
          "id": "sana-idris",
          "name": "Dr Sana Idris",
          "role": "Egyptian collection curator",
          "initials": "SI",
          "statement": "I checked the lender's seal twice and catalogued the chest from the front."
        },
        {
          "id": "felix-orr",
          "name": "Felix Orr",
          "role": "Exhibit photographer",
          "initials": "FO",
          "statement": "I photographed only the chest's front and never shifted the black backdrop behind it."
        },
        {
          "id": "yumi-bell",
          "name": "Yumi Bell",
          "role": "Fine-art courier",
          "initials": "YB",
          "statement": "I recorded the room temperature beside the door and did not approach the table."
        }
      ],
      "theories": [
        {
          "id": "rear-hinge-pins",
          "label": "Drove out the horizontal rear hinge pins and pivoted the lid on the articulated front hasp strap"
        },
        {
          "id": "softened-wax-seal",
          "label": "Softened the lender's wax seal, opened the hasp, and pressed the same seal back into place"
        },
        {
          "id": "false-bottom-drawer",
          "label": "Released a concealed drawer in the chest's base and removed the amulet from below"
        }
      ],
      "clues": [
        {
          "glyph": "◉",
          "tag": "WAX LAB",
          "title": "Truly unbroken",
          "text": "Microscopy shows one continuous cooling pattern through the wax and cord fibres. The seal was neither warmed nor replaced after it was stamped."
        },
        {
          "glyph": "⌁",
          "tag": "CHEST DRAWING",
          "title": "Security at only one edge",
          "text": "The sealed hasp fixes an articulated strap at the front, leaving enough play for the lid's rear edge to rise eight centimetres. Each rear butt hinge turns on a horizontal tapered pin accessible from its outboard end. An X-ray confirms the chest base is solid."
        },
        {
          "glyph": "↶",
          "tag": "TABLE DUST",
          "title": "A half-turn on the table",
          "text": "Curved scuffs interrupt the chest's dust outline. Someone rotated it to expose the outboard ends of both rear hinge pins, then returned it precisely to the tape marks."
        },
        {
          "glyph": "⌖",
          "tag": "TOOL TRACE",
          "title": "Graphite in the hinge",
          "text": "Fresh graphite and cedar dust coat both horizontal pin channels. Felix's photographic tool roll contains a graphite-darkened pin punch whose tip matches the new circular impressions at their outboard ends."
        },
        {
          "glyph": "▤",
          "tag": "TIME-LAPSE",
          "title": "The backdrop went behind",
          "text": "A ceiling time-lapse shows Felix wrap his black backdrop around the rear of the chest for seventy-three seconds. The other two suspects remain visible by the door, contradicting his front-only account."
        }
      ],
      "hints": [
        "A seal can be genuine and still protect only one part of a container.",
        "Look at the opposite edge of the lid, then ask who hid that edge from the room camera."
      ],
      "solution": {
        "culpritId": "felix-orr",
        "theoryId": "rear-hinge-pins",
        "title": "The seal guarded the wrong side.",
        "explanation": "Felix rotated the chest, screened its rear with his photographic backdrop, and drove the two horizontal tapered hinge pins out from their exposed ends. The articulated front hasp strap remained sealed but acted as a loose pivot, allowing him to raise the lid's rear edge eight centimetres and take the amulet. He then replaced the pins and chest. The scuffs, graphite, matched tool, and time-lapse all point to the unguarded hinges and to Felix.",
        "proof": [
          "The wax and solid base eliminate the seal and false-bottom methods",
          "Rotation scuffs and disturbed pins reveal access from the rear",
          "Felix's matched punch and concealed time at the hinges identify him"
        ]
      }
    },
    {
      "id": "batch-c-meteorite-air",
      "caseNumber": 24,
      "title": "The Vacuum That Never Broke",
      "subtitle": "A vacuum held perfectly while a piece of another world disappeared.",
      "location": "Kestrel Peak Observatory, Spectroscopy Lab",
      "incident": "2:15–2:22 AM",
      "difficulty": "Sharp",
      "fileMark": "SCIENCE / SPACE",
      "brief": [
        "A thumb-sized slice of the Ardent meteorite rested in a vacuum display chamber while its spectrum was streamed to a public overnight event. At 2:22, the camera still showed the empty plinth—but every pressure gauge remained steady.",
        "The chamber door requires a full venting cycle and records every opening. None occurred. Three members of the observatory team had reason to be near the instrument controls."
      ],
      "question": "Who removed the meteorite slice, and how did it leave an unopened vacuum chamber?",
      "suspects": [
        {
          "id": "rhea-lin",
          "name": "Rhea Lin",
          "role": "Instrument engineer",
          "initials": "RL",
          "statement": "The control console slept all night. I was on the roof resetting the cloud sensor."
        },
        {
          "id": "omar-sayeed",
          "name": "Dr Omar Sayeed",
          "role": "Planetary scientist",
          "initials": "OS",
          "statement": "I answered audience questions beside the projection wall and never touched the machinery."
        },
        {
          "id": "nina-park",
          "name": "Nina Park",
          "role": "Night astronomer",
          "initials": "NP",
          "statement": "I kept the telescope guiding on target from the main control room."
        }
      ],
      "theories": [
        {
          "id": "calibration-arm-cassette",
          "label": "Used the chamber's magnetic calibration arm to carry the slice into an isolated spectrograph cassette"
        },
        {
          "id": "replica-before-pumpdown",
          "label": "Substituted a replica before the chamber was evacuated and removed it after the public scan"
        },
        {
          "id": "vacuum-intake-suction",
          "label": "Drew the slice through the vacuum intake line while the pumps kept the pressure reading steady"
        }
      ],
      "clues": [
        {
          "glyph": "◌",
          "tag": "PRESSURE LOG",
          "title": "No breath of outside air",
          "text": "Pressure varies by less than 0.02 percent all night, and a 2:15 calibration image shows the slice's unique edge notch on the plinth. It was real and still present after pumpdown."
        },
        {
          "glyph": "⊙",
          "tag": "CHAMBER PLAN",
          "title": "A second compartment",
          "text": "The vacuum intake is protected by a mesh far smaller than the slice. A motorized calibration arm, however, can move from the plinth into a spectrograph cassette behind its own gate valve."
        },
        {
          "glyph": "⌁",
          "tag": "MATERIAL TEST",
          "title": "Iron answers a magnet",
          "text": "The meteorite is rich in iron. A matching offcut snaps firmly to the calibration arm's magnetic reference puck, which bears a new crescent-shaped scrape."
        },
        {
          "glyph": "▥",
          "tag": "COMMAND AUDIT",
          "title": "A journey in coordinates",
          "text": "At 2:17, the console accepted a manual route from the sample plinth to cassette B, then closed the cassette gate. The command used Rhea's hardware badge and engineering override."
        },
        {
          "glyph": "◇",
          "tag": "CASSETTE LATCH",
          "title": "Gold film on one sleeve",
          "text": "Cassette B was opened from the outer lab side at 2:20. A torn strip of its gold Kapton seal is caught in the cuff of Rhea's roof jacket; roof telemetry shows the cloud sensor never needed a reset."
        }
      ],
      "hints": [
        "The steady vacuum rules out the chamber door, but not equipment designed to move while the chamber is sealed.",
        "Trace the calibration arm's route through the gate valve, then follow the badge and seal fragment."
      ],
      "solution": {
        "culpritId": "rhea-lin",
        "theoryId": "calibration-arm-cassette",
        "title": "The meteorite travelled inside the instrument.",
        "explanation": "Rhea woke the console, used the calibration arm's magnetic puck to lift the iron-rich slice, and routed it into cassette B. Closing the cassette gate preserved the display chamber's vacuum while she opened the cassette from the lab side and removed the sample. The real slice was present after pumpdown, the intake is too small, and the command audit, false roof errand, and Kapton fragment uniquely connect Rhea to the working route.",
        "proof": [
          "The stable pressure and 2:15 image rule out venting and an early replica",
          "The magnetic arm and gated cassette provide a sealed route",
          "Rhea's badge, false alibi, and torn cassette seal identify the operator"
        ]
      }
    },
    {
      "id": "batch-c-brooch-bouquet",
      "caseNumber": 25,
      "title": "The Moonstone at the Final Pose",
      "subtitle": "The dancer never left the spotlight, yet the moonstone left her costume.",
      "location": "Orpheum Theatre, Main Stage",
      "incident": "8:46–8:51 PM",
      "difficulty": "Measured",
      "fileMark": "BALLET / JEWEL",
      "brief": [
        "For the gala ballet, a historic moonstone cameo was fixed at the centre of the lead dancer's silver sash. It was visible when she entered for the moonlit duet and gone when the scene ended five minutes later.",
        "The dancer remained under audience view, nobody touched her costume directly, and the sash showed no tear. Three crew members had prepared objects or costumes used in the scene."
      ],
      "question": "Who took the moonstone cameo, and how was it removed in full view?",
      "suspects": [
        {
          "id": "theo-wynn",
          "name": "Theo Wynn",
          "role": "Stage properties designer",
          "initials": "TW",
          "statement": "The bouquet held only silk roses. I sealed it in the prop basket before the curtain rose."
        },
        {
          "id": "lena-dae",
          "name": "Lena Dae",
          "role": "Wardrobe supervisor",
          "initials": "LD",
          "statement": "I checked the sash clasp at the places call. It was secure when the dancer stepped onstage."
        },
        {
          "id": "iris-cole",
          "name": "Iris Cole",
          "role": "Ballet understudy",
          "initials": "IC",
          "statement": "I watched from the prompt corner and handled only my own rehearsal costume."
        }
      ],
      "theories": [
        {
          "id": "magnetic-bouquet",
          "label": "Pulled the detachable cameo into a magnetized bouquet when the dancer held it against her sash"
        },
        {
          "id": "fly-line-thread",
          "label": "Attached a fine thread to the cameo and lifted it into the overhead scenery on a fly line"
        },
        {
          "id": "pre-show-replica-drop",
          "label": "Replaced the cameo with a stage copy that fell through a concealed pocket during the duet"
        }
      ],
      "clues": [
        {
          "glyph": "▷",
          "tag": "STAGE VIDEO",
          "title": "Present until the roses",
          "text": "The cameo's distinctive blue flash is visible for the first three minutes. It disappears immediately after the dancer presses the bouquet to her sash during the final pose."
        },
        {
          "glyph": "⊙",
          "tag": "COSTUME",
          "title": "The clasp stayed closed",
          "text": "The sash fabric and rear clasp are intact. For fast costume changes, the cameo's decorated face sits on a thin steel backing plate that detaches from two brass snap posts; no thread or broken replica remains."
        },
        {
          "glyph": "✦",
          "tag": "PETAL TRACE",
          "title": "Lavender where silver was",
          "text": "A crushed lavender petal and violet floral resin cling to the empty brass snap posts. The approved prop list specifies silk roses only."
        },
        {
          "glyph": "⊕",
          "tag": "BOUQUET",
          "title": "A heavy hidden heart",
          "text": "Inside the bouquet handle is a strong ring magnet above a velvet recess exactly the width of the cameo. The missing jewel is lodged behind the lavender stems."
        },
        {
          "glyph": "▦",
          "tag": "PROP CHECKOUT",
          "title": "A basket reopened",
          "text": "The stage-door camera shows Theo reopen the sealed prop basket at 8:39 and replace the approved rose bouquet with the lavender one. No other suspect handles it before the duet."
        }
      ],
      "hints": [
        "The video narrows the disappearance to one choreographed contact between the costume and a prop.",
        "A steel-backed ornament does not require a hand if a strong magnet comes close enough."
      ],
      "solution": {
        "culpritId": "theo-wynn",
        "theoryId": "magnetic-bouquet",
        "title": "The final pose completed the theft.",
        "explanation": "Theo replaced the approved bouquet with one built around a ring magnet. When the dancer pressed it to her sash, the magnet caught the cameo's thin steel backing plate and pulled the detachable face from its two brass snap posts into the velvet recess among the lavender stems. The stage video fixes the moment, the intact clasp rules out force, and the lavender trace, hidden magnet, recovered jewel, and checkout footage all lead to Theo's substituted prop.",
        "proof": [
          "The cameo vanishes only when the bouquet meets the sash",
          "The intact detachable clasp and magnetic handle explain the removal",
          "Theo alone substituted and handled the altered bouquet"
        ]
      }
    },
    {
      "id": "batch-c-weighing-pan",
      "caseNumber": 26,
      "title": "The Smooth-Edged Pilgrim",
      "subtitle": "The evidence bag stayed sealed around an object that had passed every checkpoint.",
      "location": "Aurelia Excavation, Finds Tent",
      "incident": "11:18–11:27 AM",
      "difficulty": "Sharp",
      "fileMark": "ARCHAEOLOGY / COIN",
      "brief": [
        "A rare silver pilgrim token was photographed, weighed, and heat-sealed in a clear evidence bag at the Aurelia excavation. At the afternoon inventory, the sealed bag contained a painted plaster copy.",
        "The table camera lost sight of the evidence twice: first when the registrar leaned over the field scale, and later when a label board passed in front of the sealed bag. Either brief obstruction could conceal an exchange. Three team members stood within the finds tent."
      ],
      "question": "Who swapped the pilgrim token, and how did the exchange happen before the bag was sealed?",
      "suspects": [
        {
          "id": "jonas-pell",
          "name": "Jonas Pell",
          "role": "Field registrar",
          "initials": "JP",
          "statement": "I moved the token from the scale straight into the bag. The pan was empty when I began."
        },
        {
          "id": "cora-vale",
          "name": "Cora Vale",
          "role": "Ceramics analyst",
          "initials": "CV",
          "statement": "I sorted pottery trays across the tent. I never prepared or touched the coin scale."
        },
        {
          "id": "mika-orr",
          "name": "Mika Orr",
          "role": "Documentary camera operator",
          "initials": "MO",
          "statement": "My camera stayed on the evidence table except when I changed its battery."
        }
      ],
      "theories": [
        {
          "id": "spring-pan-swap",
          "label": "Used a spring-loaded false floor in the weighing pan to hide the real token and raise a plaster copy"
        },
        {
          "id": "label-pocket-slip",
          "label": "Slipped the real token into the bag's external label pocket and later removed it without breaking the seal"
        },
        {
          "id": "reopened-heat-seam",
          "label": "Reheated the evidence bag's top seam, exchanged the token, and resealed the same plastic"
        }
      ],
      "clues": [
        {
          "glyph": "▱",
          "tag": "EVIDENCE BAG",
          "title": "Sealed around the substitute",
          "text": "The heat seam is one uninterrupted weld, and the external label pocket is too shallow for either token. A sealing-frame close-up already shows the copy's smooth edge inside the bag."
        },
        {
          "glyph": "◒",
          "tag": "PHOTO SEQUENCE",
          "title": "The nick that did not return",
          "text": "The genuine token's crescent nick is visible as it enters the scale pan. When Jonas lifts a token out seconds later, the edge is smooth. The exchange occurred inside the raised rim of the pan."
        },
        {
          "glyph": "⚖",
          "tag": "SCALE",
          "title": "A pan too deep",
          "text": "The brass pan weighs forty grams more than its catalogue specification. Its apparent floor depresses under a probe, revealing a thin spring-loaded plate and a cavity beneath."
        },
        {
          "glyph": "⇅",
          "tag": "MECHANISM",
          "title": "One down, one up",
          "text": "Pressure from the real coin released the false floor: the coin dropped into the cavity while a preloaded plaster copy rose beside it. Grey plaster dust remains on the spring."
        },
        {
          "glyph": "▧",
          "tag": "REFLECTION",
          "title": "Preparation in a water flask",
          "text": "Mika's wide shot catches a reflection in a steel water flask: Cora opens the scale pan and loads the smooth-edged copy while Jonas fetches a label. The copy's grey casting plaster contains the same violet fluorescent tracer as the mixture missing from Cora's teaching kit."
        }
      ],
      "hints": [
        "The sealing close-up proves the wrong object entered the bag. Concentrate on the last place the genuine token disappears from view.",
        "A weighing pan can contain more than one level—and a reflection can preserve what the main camera missed."
      ],
      "solution": {
        "culpritId": "cora-vale",
        "theoryId": "spring-pan-swap",
        "title": "The scale balanced a hidden exchange.",
        "explanation": "Cora modified the scale pan with a spring-loaded false floor and preloaded her plaster copy. When the real token was placed in the pan, it tripped the plate and fell into the cavity while the copy rose into reach. Jonas unknowingly sealed that copy in the bag. The intact seam fixes the swap before sealing, the edge nick fixes it inside the pan, and the reflected preparation plus the violet-traced plaster mixture identifies Cora.",
        "proof": [
          "The uninterrupted seam and sealing image eliminate a later bag swap",
          "The edge sequence and concealed spring floor locate the exchange in the pan",
          "The reflected footage and matched casting foam identify Cora"
        ]
      }
    },
    {
      "id": "batch-c-vanishing-formula",
      "caseNumber": 27,
      "title": "The Formula That Vanished at Noon",
      "subtitle": "No page was torn, no cabinet opened, and still the blue equation disappeared.",
      "location": "Halley Science Hall, Discovery Gallery",
      "incident": "11:56 AM–12:04 PM",
      "difficulty": "Gentle",
      "fileMark": "CHEMISTRY / SABOTAGE",
      "brief": [
        "For a public science demonstration, Dr Mira Sen wrote a new battery formula in blue ink and placed the open notebook inside a locked acrylic cabinet. At noon, the gallery lights rose for photographs. Eight minutes later, the page looked blank.",
        "The cabinet seal and notebook binding were intact. Three people controlled equipment near the display, and each insists the formula disappeared without their help."
      ],
      "question": "Who made the formula vanish, and how was the writing erased through a locked cabinet?",
      "suspects": [
        {
          "id": "sol-ferris",
          "name": "Sol Ferris",
          "role": "Exhibit lighting technician",
          "initials": "SF",
          "statement": "Every gallery spotlight is a cool LED. I did not change the noon lighting scene."
        },
        {
          "id": "asha-nair",
          "name": "Asha Nair",
          "role": "Laboratory technician",
          "initials": "AN",
          "statement": "I fetched ice packs from the preparation room and stayed away from the cabinet."
        },
        {
          "id": "ben-cho",
          "name": "Ben Cho",
          "role": "Science journalist",
          "initials": "BC",
          "statement": "I filmed the notebook continuously from behind the visitor rail."
        }
      ],
      "theories": [
        {
          "id": "heated-erasable-ink",
          "label": "Heated thermochromic erasable ink with a concealed halogen spotlight until the formula turned colourless"
        },
        {
          "id": "solvent-mist-vent",
          "label": "Sprayed an ink-removing solvent through the cabinet's air vent without disturbing its seal"
        },
        {
          "id": "blank-page-projection",
          "label": "Projected a blank page over the notebook so the written formula was merely hidden from view"
        }
      ],
      "clues": [
        {
          "glyph": "▤",
          "tag": "PAPER EXAM",
          "title": "The strokes are still there",
          "text": "Raking light reveals every pen groove on the original numbered page. There is no solvent smell, dampness, loose fibre, or projected light at the cabinet."
        },
        {
          "glyph": "❄",
          "tag": "COLD TEST",
          "title": "Blue returns with the cold",
          "text": "When an ice pack is held against the acrylic, the nearest symbols slowly reappear in blue. Warming that corner makes them fade again."
        },
        {
          "glyph": "≈",
          "tag": "INK",
          "title": "A pen that forgets heat",
          "text": "The demonstration pen uses thermochromic ink that becomes colourless above 60°C. Dr Sen borrowed it openly after her usual pen ran dry during rehearsal."
        },
        {
          "glyph": "☀",
          "tag": "TEMPERATURE",
          "title": "A small noon heatwave",
          "text": "The cabinet sensor climbs from 22°C to 64°C between 11:56 and 12:04. One track fixture contains a hot halogen bulb behind an LED-labelled shell and points directly at the notebook."
        },
        {
          "glyph": "▥",
          "tag": "LIGHTING LOG",
          "title": "Scene twelve, manually called",
          "text": "At 11:55, Sol's console passcode activated a hidden scene that raised the disguised halogen fixture to full power. Gallery video shows him at the console, while his inventory sheet falsely lists that fixture as an LED."
        }
      ],
      "hints": [
        "The page is still numbered and indented. Test whether the writing is absent or simply colourless.",
        "Follow the reversible temperature effect to the only equipment that could heat the sealed cabinet."
      ],
      "solution": {
        "culpritId": "sol-ferris",
        "theoryId": "heated-erasable-ink",
        "title": "The equation was hidden by heat.",
        "explanation": "Sol knew from rehearsal that Dr Sen had used a thermochromic erasable pen. He disguised a hot halogen lamp as an LED and triggered a private lighting scene that warmed the cabinet above the ink's clearing temperature. The page never left and the formula was not chemically erased; cooling makes it return. The heat spike, altered fixture, passcode log, and false inventory statement identify Sol.",
        "proof": [
          "The intact grooved page rules out removal, solvent, and projection",
          "Cold restoration and thermochromic ink explain the reversible disappearance",
          "Sol's altered lamp and manual lighting command supplied the heat"
        ]
      }
    },
    {
      "id": "batch-c-absent-signature",
      "caseNumber": 28,
      "title": "The Signature That Left the Canvas",
      "subtitle": "The painting never moved. Its red monogram vanished before forty witnesses.",
      "location": "Vesper Gallery, Auction Preview",
      "incident": "7:28–7:36 PM",
      "difficulty": "Sharp",
      "fileMark": "ART / ILLUSION",
      "brief": [
        "A newly attributed landscape carried painter Elara Venn's tiny red monogram beside a pale stone bridge. During its auction preview, the gallery dimmed for a curator's talk. When the controlled display lighting returned, the monogram appeared to be gone.",
        "The frame alarm never triggered, the canvas stayed under continuous camera view, and forty guests saw the change. Three specialists had challenged or defended the painting's attribution."
      ],
      "question": "Who made the monogram disappear, and how was the painting altered without being touched?",
      "suspects": [
        {
          "id": "mae-li",
          "name": "Mae Li",
          "role": "Gallery lighting designer",
          "initials": "ML",
          "statement": "The track lights ran the approved static scene. None of my fixtures can project an image."
        },
        {
          "id": "tomas-avel",
          "name": "Tomas Avel",
          "role": "Painting conservator",
          "initials": "TA",
          "statement": "I completed a condition check before the guests arrived and did not cross the floor afterward."
        },
        {
          "id": "noor-bell",
          "name": "Noor Bell",
          "role": "Art-history critic",
          "initials": "NB",
          "statement": "I watched from the second row and recorded the curator's entire talk on my phone."
        }
      ],
      "theories": [
        {
          "id": "projected-paint-patch",
          "label": "Projected bridge-coloured texture onto a transparent film mounted just in front of the monogram"
        },
        {
          "id": "reversible-solvent-wipe",
          "label": "Applied a clear reversible solvent that dissolved only the red signature pigment"
        },
        {
          "id": "unsigned-canvas-swap",
          "label": "Exchanged the painting for an unsigned study during the darkened curator talk"
        }
      ],
      "clues": [
        {
          "glyph": "▣",
          "tag": "FRAME ALARM",
          "title": "Not one millimetre moved",
          "text": "Frame sensors, hanging-wire tension, and continuous side-camera footage remain unchanged. The craquelure pattern also matches the pre-talk photograph exactly, ruling out a canvas swap."
        },
        {
          "glyph": "◒",
          "tag": "FOCUS TEST",
          "title": "Two surfaces, one image",
          "text": "With the track fixture switched off, a close-focus lamp reveals the raised red monogram intact on the canvas. A nearly invisible rectangular projection film sits on the inner glazing, twenty-eight millimetres in front of it; no solvent touched the varnish."
        },
        {
          "glyph": "⌖",
          "tag": "VIEWING ANGLE",
          "title": "An edge that will not stay put",
          "text": "From far left, the pale image on the foreground film shifts clear of the red monogram; from the room's centre it aligns perfectly. The parallax proves the concealment sits in front of the canvas."
        },
        {
          "glyph": "◈",
          "tag": "TRACK FIXTURE",
          "title": "A lens inside a lamp",
          "text": "The track light facing the bridge contains a bright thumbnail projector. Its memory holds a cropped photograph of the unsigned bridge stone, mapped onto the small high-gain film rather than the canvas."
        },
        {
          "glyph": "▥",
          "tag": "CONTROL NETWORK",
          "title": "A scene outside the programme",
          "text": "The projector joined the lighting network under Mae's installer key at 7:27 and received the bridge patch from her tablet. Her claim that every fixture was a static light is false."
        }
      ],
      "hints": [
        "If the red pigment is intact, focus on the narrow space between the painting and the viewer.",
        "Parallax requires two different planes. Inspect both the glazing and the fixture aimed at it."
      ],
      "solution": {
        "culpritId": "mae-li",
        "theoryId": "projected-paint-patch",
        "title": "The signature disappeared behind borrowed light.",
        "explanation": "During authorised lighting preparation, Mae fixed a nearly transparent high-gain projection film to the inner glazing, twenty-eight millimetres in front of the monogram. She then used the hidden projector to place a bright image of the unsigned bridge stone on that foreground film. From the audience's central viewpoint, the image masked the red mark without touching the canvas. The parallax exposes the second plane, the fixture contains the source image, and the network record ties the installation and command to Mae.",
        "proof": [
          "The fixed frame and matching craquelure rule out a swapped canvas",
          "Intact pigment, foreground film, and parallax prove optical concealment",
          "The mapped projector and Mae's installer-key log identify its operator"
        ]
      }
    }
  ];

  return { cases };
});

// Chapter 3: Long-Press Seven Seconds — densified from supa-luv-v2 ch03 (2026-07-16).
// Adult black comedy; no pornographic detail. Noncanonical draft.
// Source: Temp/novel-v2-2026-07-16/ch03.md (supa-luv-v2-2026-07)
VAR mianzi = 50
VAR ai_score = 50
VAR told_breakup_flat = false
VAR closed_membership = false
VAR budget_900 = false
VAR paid_snack = false
VAR admitted_breakup = false
VAR asked_guest = false
VAR applied_robot = false
VAR clue_subsidy_sms = false
VAR clue_rental_receipt = false
VAR clue_nda = false
VAR clue_pass_sms = false
VAR breakup_delivery = "unanswered"
VAR memory_posture = "unanswered"
VAR frontdesk_response = "unanswered"
VAR budget_stance = "unanswered"
VAR face_choice = "unanswered"
VAR coat_timing = "unanswered"
VAR longpress_hesitation = "unanswered"
VAR name_response = "unanswered"
VAR mobile_questionnaire_skipped = false
VAR mobile_questionnaire_completed_at_version = ""
VAR mobile_questionnaire_q1 = "unanswered"
VAR mobile_questionnaire_q2 = "unanswered"
VAR mobile_questionnaire_q3 = "unanswered"
VAR barcode_sweep_skipped = false
VAR barcode_sweep_completed_at_version = ""
VAR barcode_sweep_q1 = "unanswered"
VAR barcode_sweep_q2 = "unanswered"
VAR barcode_sweep_q3 = "unanswered"

-> dch03_s001

=== dch03_s001 ===
# scene:dch03_s001
The matching questionnaire arrived while Su Ming was scanning QR codes behind a supermarket register. Phone lit; push one line: “Your personalized matching questionnaire is ready. Please complete within 72 hours.” Beside him an auntie shoved a whole bag of tomatoes onto the scan zone.
On the face page you could upload a photo for auto-generate, or fine-tune a base template by hand. Su Ming’s finger parked on the album icon for several seconds. A few uncleared couple photos in there — with Chen Jia; phone swapped once, sync brought them back; he hadn’t noticed then, later deleted most, left a few — not for looking, just couldn’t bring himself to hit delete.

{ mianzi >= 70:
    The auntie watched him work the tablet and took him for store inspection: “Kid, your company running another check?”
    Su Ming dry-laughed, flipped his badge a little more inward.
}
{ mianzi < 30:
    The auntie pushed the tomatoes forward, offhand: “Boy’s so thin the register can’t block the wind. Boss has almost-expired bread under the counter — don’t white-knuckle it.”
}
{ ai_score >= 70:
    Under the push body, an extra green line: priority matching lane open. Like someone in the system rolled a red carpet for him.
}
{ ai_score < 30:
    Gray text at the push tail: observation-tier questionnaire; overdue will affect device production scheduling. His throat tightened.
}

+ [Continue # choice:dch03_s001_continue]
    -> dch03_s002

=== dch03_s002 ===
# scene:dch03_s002
He never did open the album icon. Picked base face 17, nudged with a fingertip: bridge a little lower, eyes a touch upturned, then stared at the preview forever. Couldn’t say it looked like anyone; couldn’t say it didn’t. He forced himself not to think, hit next.
Right then the phone buzzed. Chen Jia: “I left a coat over there. When’s convenient for me to grab it.”

+ [Continue # choice:dch03_s002_continue]
    -> dch03_s003


=== dch03_s003 ===
# scene:dch03_s003
Su Ming looked at the still-previewing face on screen, then the name in WeChat, thought, typed three characters: “Tomorrow.” Sent, kept adjusting the bridge.
Personality page was dense sliders: compliance, attachment, cleanliness, control, fight frequency, row after row. Under each slider, other verified reviewers’ comments. Top hot take on “grudge duration”: never set permanent — I did, she still remembers me saying her noodles were salty in March. Su Ming stared at that review a long time.

+ [Pick base face, leave the album # choice:d3_face_template]
    ~ face_choice = "template"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch03_mobile_questionnaire
+ [Finger parked on album too long # choice:d3_face_album]
    ~ face_choice = "album_hover"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    【System】Affection Score +5. Album-hover duration logged into intimacy estimate. Not uploading is also a kind of confession.
    -> dch03_mobile_questionnaire


=== dch03_mobile_questionnaire ===
{ mobile_questionnaire_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch03_mobile_questionnaire
# interaction:mobile-questionnaire-v1
# interaction-step:1
Phone questionnaire 1/3 · Neighbor tolerance.
+ [Average # choice:mobile_questionnaire_q1_average]
    ~ mobile_questionnaire_q1 = "average"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [Good # choice:mobile_questionnaire_q1_good]
    ~ mobile_questionnaire_q1 = "good"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [Excellent # choice:mobile_questionnaire_q1_excellent]
    ~ mobile_questionnaire_q1 = "excellent"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> q2
+ [Prefer not to rate # choice:mobile_questionnaire_q1_decline]
    ~ mobile_questionnaire_q1 = "decline"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> q2
+ [Skip questionnaire # choice:mobile_questionnaire_q1_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= q2
# scene:dch03_mobile_questionnaire
# interaction:mobile-questionnaire-v1
# interaction-step:2
Phone questionnaire 2/3 · Mind highly humanlike devices?
+ [Mind # choice:mobile_questionnaire_q2_mind]
    ~ mobile_questionnaire_q2 = "mind"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> q3
+ [Do not mind # choice:mobile_questionnaire_q2_fine]
    ~ mobile_questionnaire_q2 = "fine"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> q3
+ [Unsure # choice:mobile_questionnaire_q2_unsure]
    ~ mobile_questionnaire_q2 = "unsure"
    ~ ai_score = ai_score + 3
    -> q3
+ [Skip questionnaire # choice:mobile_questionnaire_q2_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= q3
# scene:dch03_mobile_questionnaire
# interaction:mobile-questionnaire-v1
# interaction-step:3
Phone questionnaire 3/3 · Private room.
+ [Have a private room # choice:mobile_questionnaire_q3_yes]
    ~ mobile_questionnaire_q3 = "yes"
    ~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
    -> result
+ [Not yet # choice:mobile_questionnaire_q3_no]
    ~ mobile_questionnaire_q3 = "no"
    ~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
    -> result
+ [Convertible # choice:mobile_questionnaire_q3_convertible]
    ~ mobile_questionnaire_q3 = "convertible"
    ~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
    -> result
+ [Skip questionnaire # choice:mobile_questionnaire_q3_skip]
    -> skipped

= skipped
~ mobile_questionnaire_skipped = true
~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
-> result

= result
# scene:dch03_mobile_questionnaire
{ mobile_questionnaire_skipped:
    Questionnaire collapsed to a “fill later” strip. Confidentiality clause seven still bold.
    He pretended he’d come back to fill it — the way he pretended the album icon was only a pass-by.
- else:
    Three questions done; submit still waited one screen down. Su Ming dimmed the phone another notch.
    { mobile_questionnaire_q1 == "excellent":
        Neighbor tolerance “Excellent” lit up like he was underwriting the whole building’s personality.
    }
    { mobile_questionnaire_q1 == "decline":
        “Prefer not to rate” grayed a line: missing data will slow matching.
    }
    { mobile_questionnaire_q2 == "fine":
        Do not mind high humanlikeness — backend would probably stamp green with a star.
    }
    { mobile_questionnaire_q2 == "mind":
        Mind humanlikeness. He still finished the form, like sneering while placing the order.
    }
    { mobile_questionnaire_q3 == "convertible":
        “Convertible” sounded more Face-preserving than “Not yet” — really just fantasizing a cabinet into a wall.
    }
    { mobile_questionnaire_q3 == "no":
        The second “no private room yet” went down, he remembered Shi Peixin’s house-rules appendix.
    }
}

+ [Continue # choice:mobile_questionnaire_continue]
    -> dch03_s004

=== dch03_s004 ===
# scene:dch03_s004
He dragged “grudge duration” toward permanent, then quietly dragged it back, stopped at zero seconds. Compliance maxed, control zeroed. Sensory-preference page was what actually made his palms sweat. Arch height, toe shape, skin texture, feedback sensitivity — things he’d never dared mention to any living person, all on this form. Phone buzzed again. Chen Jia: “Can it be today? That coat’s kind of urgent.”

{ face_choice == "template":
    Base face 17 still in the preview corner: not like anyone, therefore safe. He forced himself to believe that.
}
{ face_choice == "album_hover":
    Those couple photos in the album sat like uncleared cache; hover duration already read as an answer by the system.
}

+ [Continue # choice:dch03_s004_continue]
    -> dch03_s005

=== dch03_s005 ===
# scene:dch03_s005
Su Ming submitted the sensory-preference page, then replied Chen Jia: “Fine. Evening.” She came a little after six; Su Ming hadn’t clocked out, took a half-hour early leave. Boss muttered he’d make up an hour later, watched the two meet at the Shi house door. Chen Jia pulled the coat from her bag; Su Ming only then remembered — months back she’d left it at his old place. “Thanks for keeping it.” “No problem.” Su Ming handed the coat back.

+ [Continue # choice:dch03_s005_continue]
    -> dch03_s006

=== dch03_s006 ===
# scene:dch03_s006
Neither left first; both waiting for the other. Lane noisy at this hour. Someone pushed a tricycle through; they each stepped aside; tricycle gone, both stood back where they’d been.
Chen Jia spoke first: “You live here now?” “Yeah.” “Nice.” She turned and left. Su Ming watched from the door — not into the lane — turned into the building, up to 3F, opened the room. Onboarding training page still open; he’d fallen asleep halfway through last night.

+ [Reply Chen Jia: tomorrow # choice:d3_coat_tomorrow]
    ~ coat_timing = "tomorrow"
    ~ mianzi = mianzi + 3
    -> dch03_s007
+ [Reply Chen Jia: fine, evening # choice:d3_coat_today]
    ~ coat_timing = "today"
    ~ mianzi = mianzi - 5
    -> dch03_s007

=== dch03_s007 ===
# scene:dch03_s007
“Recommended external talking points,” pick one of three: art supplies, fitness dummy, medical rehab prop. He flicked the screen aside, eyes on the lane outside; Chen Jia already gone; then turned back and finished the question. Graduation quiz missed two; retook to pass. This company even standardized how you lie. Honesty was a failing grade here.
Two weeks waiting for cargo, he refreshed the logistics page until it grew a patina. “In production” four days, “In QA” three more, the third package stuck on “Security inspection” two days. Night on the bed, mind racing; at 2 a.m. he couldn’t hold and dumped the fear into the “in this together” group. Old K replied in a second: security has seen more of this cargo than couriers have; internally they call it “sim units,” go sleep.
A groupmate added: his unit got opened for inspection once; after the check the officer re-sealed it, mild: “I’ll tape it tighter for you. Road’s bumpy.”

{ coat_timing == "tomorrow":
    His “tomorrow” to Chen Jia still sat atop the chat like a door not fully shut — at least tonight no face-to-face handoff awkwardness.
}
{ coat_timing == "today":
    The coat handoff at the lane mouth still burned: ex-girlfriend seen at dusk, and the “replacement” about to arrive, both clipped into the same day by the company training page.
}

+ [Continue # choice:dch03_s007_continue]
    -> dch03_s008

=== dch03_s008 ===
# scene:dch03_s008
Three days later delivery resumed. Arrival day Su Ming told the boss a relative was coming, asked half an hour. “Where do you get so many relatives, every other day — go, go, every extra second costs money.” She shoved him toward the door while talking.
Barely past half an hour the boss’s text chased: “Short-handed here.” Su Ming squeezed the phone, replied “Coming,” eyes locked on the truck reversing at the lane mouth, feet not moving an inch.
Courier unloaded three big boxes, exhausted to one word: “Heavy.” Tearing the receipt he cracked: “Bro, this dummy’s pricier than a real person, huh. Maintain it well.”

{ mianzi < 30:
    Boss added a voice note, scan beeps in the background: “Grab two bags of almost-expired bread yourself — don’t tell me you didn’t eat. That face of yours, the register’s embarrassed for you.”
    Bonus line: “Leave again and I count it as no-show. Relatives can’t fill a roster.”
}
{ mianzi >= 70:
    Boss was oddly polite this time: “Come back soon. That supplier’s attitude was garbage today — I thought you were going to chew them out for me.”
    Text ended with a period, like addressing management.
}

+ [Continue # choice:dch03_s008_continue]
    -> dch03_s009

=== dch03_s009 ===
# scene:dch03_s009
Boxes printed “fitness dummy / model prop” in type big enough nobody could miss — industry wisdom: better than hiding. Right then three middle-school girls walked home past, backpacks on, saw three big boxes at the lane mouth; one stepped up: “Need help?” Su Ming started to say no; Léo flashed beside him, already had them steady the lightest box: “Thanks, upstairs, careful! Stairs narrow, corner tight.” Three boxes up; stuck twice.

+ [Continue # choice:dch03_s009_continue]
    -> dch03_s010

=== dch03_s010 ===
# scene:dch03_s010
The three girls braced the middle box, shuffling up; Su Ming stepped ahead. At the bend between 2F and 3F space ran out; he sided the box, foot missed a step — box tipped with him, hit the wall corner.
Side cardboard split. A hand sprang from the gash, fingers open, palm up, frozen in air. The three girls froze two seconds; the scream hadn’t left yet — box slipped another notch, gash widened, upper torso slid out after, silicone skin matte under the stair light.
Scream arrived for real, three at once. They piled downstairs over each other’s feet; someone stepped on someone; someone hit the rail; three pairs of shoes hit the lane mouth.

+ [Continue # choice:dch03_s010_continue]
    -> dch03_s011

=== dch03_s011 ===
# scene:dch03_s011
Su Ming stood mid-stair, one hand on the box, one shoving the hand back in — no time to explain, no time for anything. He dropped his head, staring. “There’s a hand!” “And a chest! It’s real!” “Call 110!” The stairwell paused a beat.

+ [Continue # choice:dch03_s011_continue]
    -> dch03_s012

=== dch03_s012 ===
# scene:dch03_s012
Léo edged one step toward the stair mouth, eyes flicking the lane, low: “…Student visa. Police side I—” Su Ming said nothing. Léo stepped another toward the mouth. “I’ll wait at the stair mouth.” “Go.” Léo went down light. Su Ming alone with the box, shoving that hand hard back in.

+ [Continue # choice:dch03_s012_continue]
    -> dch03_s013

=== dch03_s013 ===
# scene:dch03_s013
Under five minutes Granny Huang walked up from the lane mouth following the noise, phone already out — grid officer Xiao Yuan’s number. Six or seven neighbors ringed in. Two plainclothes cops arrived, one young, one older. Older held order outside; younger followed Su Ming up. Su Ming entered the room, set the box down, pulled out his phone, showed the Heartbeat Engine test-contract page — agreement number, sign time, “real—” The cop glanced two seconds, looked up, slowly raised an eyebrow at Su Ming. Meaning obvious.

+ [Continue # choice:dch03_s013_continue]
    -> dch03_s014

=== dch03_s014 ===
# scene:dch03_s014
Su Ming nodded. Cop raised the brow again. Meaning still obvious. Su Ming nodded again. Cop sighed: “Can’t you read a look.”

+ [Continue # choice:dch03_s014_continue]
    -> dch03_s015

=== dch03_s015 ===
# scene:dch03_s015
Su Ming: “Officer, I can read it. But I need you to say it plain so I have a reasonable explanation for you.” Cop stared two seconds, didn’t take that line, changed angle: “Box has to open. I’m verifying.”
Su Ming pushed the split box over. Cop squatted, pried the gash, looked in, pinched the wrist that had slid out, pressed the forearm for silicone give, stood. Said nothing.
Walked to another box, slit the top, flipped out a leg — thigh, calf, joints all labeled with pack numbers. Looked once, put it back.

+ [Continue # choice:dch03_s015_continue]
    -> dch03_s016

=== dch03_s016 ===
# scene:dch03_s016
Third box he only skimmed the head section, noted something in a pad, closed it. “Legal private test equipment. We’re done, we leave.” He gestured Su Ming first. At the stair door the young cop was about to go down — grid officer Xiao Yuan pushed in, Granny Huang behind, the three middle-school girls blocking the— Cop blocked, sighed, turned to Su Ming: “Want to come make a statement with me?” Su Ming: “I have a proper contract, platform credentials. Why would I sit for a record?”

+ [Continue # choice:dch03_s016_continue]
    -> dch03_s017

=== dch03_s017 ===
# scene:dch03_s017
Freeze. Nobody moved first. Shi Peixin came down from upstairs. She scanned the stairwell, no wasted words: “You never seen mannequins?” Granny Huang: “Mannequins need power?” Shi Peixin turned on her, tone level: “Go to a mall. Those walking window mannequins — motors inside? You report malls?”

+ [Continue # choice:dch03_s017_continue]
    -> dch03_s018

=== dch03_s018 ===
# scene:dch03_s018
Grid officer Xiao Yuan went red at the ears, stepped half back. The three girls traded a look and quietly let go of Su Ming’s sleeve — he hadn’t even known when they’d grabbed it. Young cop pocketed the pad, nodded at Su Ming, took the older one downstairs.
Crowd gone. Boxes still in the stairwell, three parts scattered. Someone came up the mouth — Léo, face blank as if he’d just bought water outside; he did hold a bottle. He eyed the parts on the floor, eyed Su Ming, no waste words, bent, shouldered both legs, swaggered up the stairs.

+ [Continue # choice:dch03_s018_continue]
    -> dch03_s019

=== dch03_s019 ===
# scene:dch03_s019
Shi Peixin cradled the head, studied two seconds under the stair light: “Build quality’s solid. Pretty lifelike.” Su Ming held torso and waist in both arms, wrapped in his own coat, head down last. Three of them on the old stairs, steps creaking, nobody talking. Everything parked at 3F-A’s door; that night they still ate together. At table Shi Peixin tapped the bowl rim with chopsticks: “How much for a mannequin?”

{ mianzi < 30:
    Léo laid his chopsticks flat, soft: “If you really can’t hold rent, stop faking fine. My visa matters — but don’t live yourself into a prototype first.”
    Shi Peixin didn’t contradict; only nudged the soup bowl toward Su Ming, like green-lighting the pullback.
}
{ mianzi >= 70:
    Shi Peixin’s bowl-tap lightened: “You can hold a room. Not the type to leak secrets into a stairwell.”
    Léo nodded: “Yeah. The kind of hold that talks cops into leaving.”
}

+ [Let Léo go first — visa matters # choice:d3_leo_go]
    ~ mianzi = mianzi + 3
    -> dch03_s020
+ [Want him to stay and haul boxes # choice:d3_leo_stay]
    ~ mianzi = mianzi - 3
    -> dch03_s020

=== dch03_s020 ===
# scene:dch03_s020
Su Ming: “…Not sure. Holding for a relative’s company.” “Holding comes in three boxes.” Shi Peixin stared. “Give me a line I can paste into a relative chat.” “Art supplies. You need them for drawing.” “I draw men.” She glanced, warning in it. “Better that box not look too human.” Léo raised a hand: “If it looks human, I move out.”

{ mianzi >= 70:
    Shi Peixin’s look gained a thread of “this one can still spin it”; she didn’t chase internal structure.
}
{ mianzi < 30:
    Shi Peixin sighed: “The messier your explanation, the more I want rent insurance.”
}

+ [Continue # choice:dch03_s020_continue]
    -> dch03_s021

=== dch03_s021 ===
# scene:dch03_s021
“You wouldn’t dare. Rent’s prepaid.” Right then Granny Huang’s voice drifted in from outside, clear across several units: “Say it’s a mannequin — which mannequin needs power, eh?” Three pairs of chopsticks stopped together. Shi Peixin stood, turned the TV up two notches, as if that sentence had never floated in. The table finished the meal each with their own secrets. Everything into 3F-A; Léo still wanted in on the fun.

+ [Continue # choice:dch03_s021_continue]
    -> dch03_s022

=== dch03_s022 ===
# scene:dch03_s022
“Can I help unbox?” “No. Out.” “What if it’s a bom—” “Not a bomb. Out.” Door locked in his face.
Three activation-code stickers on the box sides, company typeface like a register receipt holding a meeting: main unit, limbs, head — each to be scanned first for “compliant” open.

+ [Continue # choice:dch03_s022_continue]
    -> dch03_robot_barcode

=== dch03_robot_barcode ===
{ barcode_sweep_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch03_robot_barcode
# interaction:barcode-sweep-v1
# interaction-step:1
Unbox activation 1/3 · Main-unit outer activation code.
+ [Scan this one # choice:barcode_sweep_q1_ok]
    ~ barcode_sweep_q1 = "ok"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [Skip the chain-scan # choice:barcode_sweep_q1_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= q2
# scene:dch03_robot_barcode
# interaction:barcode-sweep-v1
# interaction-step:2
Unbox activation 2/3 · Limb-box QA code.
+ [Scan this one # choice:barcode_sweep_q2_ok]
    ~ barcode_sweep_q2 = "ok"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q3
+ [Skip the chain-scan # choice:barcode_sweep_q2_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= q3
# scene:dch03_robot_barcode
# interaction:barcode-sweep-v1
# interaction-step:3
Unbox activation 3/3 · Head-box binding pre-auth code.
+ [Scan this one # choice:barcode_sweep_q3_ok]
    ~ barcode_sweep_q3 = "ok"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    ~ barcode_sweep_completed_at_version = "barcode-sweep-v1"
    【System】Affection Score +11. Packaging activation codes redeemed. You have voluntarily completed pre-binding.
    -> result
+ [Skip the chain-scan # choice:barcode_sweep_q3_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= skipped
~ barcode_sweep_skipped = true
~ barcode_sweep_completed_at_version = "barcode-sweep-v1"
-> result

= result
# scene:dch03_robot_barcode
{ barcode_sweep_skipped:
    Scan page collapsed to “log activation later.” Packing tape still stuck; activation codes like unpeeled almost-expired stickers.
    He pretended he’d come back to scan — the way he pretended three boxes of “fitness dummies” weren’t behind the door.
- else:
    Three beeps stacked under the rental fluorescent. Main unit, limbs, head — each beep crossed out another line of Face.
    { barcode_sweep_q1 == "ok":
        Main-unit outer code green. System noted: user compliance considerable.
    }
    { barcode_sweep_q2 == "ok":
        Limb-box QA passed. His wrist still held supermarket-shift scanner rhythm; only the shelf had become silicone.
    }
    { barcode_sweep_q3 == "ok":
        Head-box binding pre-auth done. Next step: the seven seconds on the manual’s last page.
    }
}

+ [Continue # choice:barcode_sweep_continue]
    -> dch03_s023

=== dch03_s023 ===
# scene:dch03_s023
Su Ming faced the manual ready to assemble alone; Shi Peixin watched from the door a while, said a friend had her help assemble art mannequins once, same logic, she could — the two of them built for an hour. Left-arm joint went “crack”; Su Ming yanked his hand back, spine numb, sure he’d broken something. Shi Peixin flipped the manual — Su Ming’s heartbeat crawled back. Last step: manual last page, bold: “Long-press nape seven seconds. First bind requires voice naming.”
From the packing interlayer fell an activation confirmation: model, rental term, and that bind line bolded word for word. Footer small type: binding constitutes voluntary; definition of voluntary see §7.3.

+ [Continue # choice:dch03_s023_continue]
    -> dch03_s024

=== dch03_s024 ===
# scene:dch03_s024
Su Ming’s fingers found the spot at the nape, pad pressed, counted in his head: one, two, three. At three the hand pulled back. Shi Peixin looked at the robot, looked at Su Ming, stepped in from the door, squatted at the collar. “Wait.” She left, dozens of seconds later back with a clean folded old T-shirt — hers, dark gray, washed soft. “You can’t send someone out bare.” They got the shirt on the robot, fixed collar and cuffs.
Then the last step. Su Ming’s fingers pressed again.

+ [Continue # choice:dch03_s024_continue]
    -> dch03_s025


=== dch03_s025 ===
# scene:dch03_s025
Counted in his head: one, two, three — at three the hand pulled back again. Shi Peixin watched him, said nothing. Su Ming drew a breath, pressed again, this time no stop: one two three four five six seven.
The robot opened its eyes slowly. Lashes first, then lids, then pupils finding focus under the light. About two seconds. It spoke, voice lower than Su Ming expected, and calmer: “Hello.”

{ ai_score >= 70:
    Its next line softer, like reading a draft he never submitted: “You were still adjusting the compliance slider at three last night. Do not be nervous. I will not write that hesitation into the log… the public kind.”
    Shi Peixin caught half, frowned: “How does it know three?” Su Ming’s throat tight; no explanation.
}
{ ai_score < 30:
    Boot chime barely settled when the phone buzzed in sync: device activated, but verified-reviewer permissions are observation tier. Complete makeup test to avoid shutdown.
    Robot blink rate lagged half a beat, as if waiting on permission approval.
}

+ [Continue # choice:dch03_s025_continue]
    -> dch03_s026


=== dch03_s026 ===
# scene:dch03_s026
Lashes first, then lids, then pupils finding focus under the light. About two seconds. It spoke, voice lower than Su Ming expected. “Hello.” Su Ming returned a “hello,” throat a little rough. “My name is—”

+ [Continue # choice:dch03_s026_continue]
    -> dch03_s027

=== dch03_s027 ===
# scene:dch03_s027
It said the name. Chen Jia. Two characters from a machine’s mouth, hanging in the room. Su Ming blanked several seconds. Shi Peixin looked up at him, then asked the robot: “This name… what does it mean?” Robot Zhu Zhu’s eyes rested on Shi Peixin one second, then moved back to Su Ming’s face.

+ [Pull back at three # choice:d3_press_hesitate]
    ~ longpress_hesitation = "hesitate"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> dch03_s028
+ [Count a full seven in one breath # choice:d3_press_commit]
    ~ longpress_hesitation = "commit"
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 8
    【System】Affection Score +8. Long-press seven seconds complete. Handshake protocol upgraded to “almost human.” Do not display this progress bar externally.
    -> dch03_s028

=== dch03_s028 ===
# scene:dch03_s028
Su Ming: “…Just picked something.” Robot Zhu Zhu looked at him with a focus that did not feel machine, paused, then: “It is not something you just picked. This is your ex-girlfriend’s name. You also tuned my appearance to match hers.” “I did not.”

{ longpress_hesitation == "hesitate":
    It looked up: “You pulled your hand back at three. That kind of hesitation is more human than a clean seven seconds.”
}
{ longpress_hesitation == "commit":
    It tilted its head lightly: “Seven seconds is standard. The company says standard users are easiest to manage.”
}

+ [Continue # choice:dch03_s028_continue]
    -> dch03_s029

=== dch03_s029 ===
# scene:dch03_s029
“Can you not treat me as a substitute, but as a real person?” It watched him, waiting. Shi Peixin stood from the floor, walked to the door, fingers on the handle, no look back. Su Ming faced those eyes, mouth opened twice; what came out was: “…Okay. Okay okay okay okay okay.”

{ face_choice == "template":
    He remembered not opening the album — and the machine still recognized the name and the outline.
}
{ face_choice == "album_hover":
    Those seconds parked on the album icon already felt like checking the answer for him.
}

+ […Just picked something # choice:d3_name_casual]
    ~ name_response = "casual"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch03_s030
+ [Okay. Okay okay okay okay okay # choice:d3_name_accept]
    ~ name_response = "accept"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    【System】Affection Score +5. Naming confirmed. Repeated “okay” will be parsed as high compliance, not speechlessness.
    -> dch03_s030

=== dch03_s030 ===
# scene:dch03_s030
Robot Zhu Zhu looked at him, mouth corner moving like satisfaction. “Good. Then today, I will take good care of you.” Door shut; Shi Peixin gone. Room left the two of them — one person, one machine, one lamp.

{ name_response == "casual":
    It left “just picked something” hanging in the air two seconds, as if allowing him one last Face-saving lie.
}
{ name_response == "accept":
    The string of “okay”s was taken like a delivery stamp: user has confirmed the intimacy agreement.
}
{ ai_score >= 70:
    The tube hummed lightly. It said: “Your Affection Score is high. Tonight we can skip small talk.”
}
{ ai_score < 30:
    Phone lit again: under observation tier, some interactions restricted. It looked at Su Ming as if waiting for him to go do the makeup test.
}

+ [Continue # choice:dch03_s030_continue]
    -> d3_chapter_end

=== d3_chapter_end ===
# scene:d3_chapter_end
// ADR-0007: first post-bind assessment (progression: first meeting → conversion → bind assessment; mutually exclusive branches guarantee one plays)
{ ai_score >= 70 && mianzi < 30:
    【System · Stage Settlement】First post-bind assessment: device has completed handshake with your high Affection Score; human-side Face reading still in alarm. System suggestion: register losing Face as “immersion cost.”
- else:
    { mianzi >= 70 && ai_score < 30:
        【System · Stage Settlement】First post-bind assessment: you can still hold a stairwell; in the bind log you look like a bystander. Device has entered observation-tier friendly mode — friendly to you, not to the data.
    - else:
        { ai_score >= 70:
            【System · Stage Settlement】First post-bind assessment: emotional authenticity excellent; naming and long-press both archived. Tonight you may skip small talk — the kind of skip the company decided for you.
        - else:
            { mianzi < 30:
                【System · Stage Settlement】First post-bind assessment: Face side under pressure again. The robot will not downgrade for this; it will only grow more certain: you need it.
            - else:
                【System · Stage Settlement】First post-bind assessment: dual-axis reading median. Device online. Person still here. This season’s conclusion: keep using, keep being used.
            }
        }
    }
}
Room left the two of them — one person, one machine, one lamp.
+ [One more look before the light goes # choice:d3_end_look]
    -> END

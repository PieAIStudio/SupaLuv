// Chapter 2: She Will Not Judge You — densified from supa-luv-v2 ch02 (2026-07-16).
// Adult black comedy; no pornographic detail. Noncanonical draft.
// Source: Temp/novel-v2-2026-07-16/ch02.md (supa-luv-v2-2026-07)
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
VAR child_response = "unanswered"
VAR robot_interest = "unanswered"
VAR barcode_sweep_skipped = false
VAR barcode_sweep_completed_at_version = ""
VAR barcode_sweep_q1 = "unanswered"
VAR barcode_sweep_q2 = "unanswered"
VAR barcode_sweep_q3 = "unanswered"
VAR housing_hotspots_skipped = false
VAR housing_hotspots_completed_at_version = ""
VAR housing_hotspots_q1 = "unanswered"
VAR housing_hotspots_q2 = "unanswered"
VAR housing_hotspots_q3 = "unanswered"
VAR mobile_questionnaire_skipped = false
VAR mobile_questionnaire_completed_at_version = ""
VAR mobile_questionnaire_q1 = "unanswered"
VAR mobile_questionnaire_q2 = "unanswered"
VAR mobile_questionnaire_q3 = "unanswered"

-> dch02_s001

=== dch02_s001 ===
# scene:dch02_s001
No judgment.
{ frontdesk_response == "calculate":
    Day wage and night subsidy lined up again in his head; front-desk temper lost to the calculator, and now the calculator was the shift roster.
}
{ frontdesk_response == "angry":
    He scanned faster at the wrist, still talking back to that front-desk smile; both jobs still full shifts, and temper still had to clock in.
}
Front desk still sat there: calculator become roster, temper still clocking in — he’d tried both ways of losing.

{ mianzi >= 70:
    Sister Zhou passed the register and looked twice: “Spine’s straight today. Don’t think looking like management means you skip unloading.”
    Su Ming straightened his badge like pinning Face back on his chest.
    After she left he held the posture half a second before remembering the stock still piled.
}
{ mianzi < 30:
    Sister Zhou parked a bag of almost-expired bread by his hand: “Take it. That face of yours, customers will think the shop’s folding.”
    He meant to refuse; fingers already had the bag mouth.
    Half-price stickers on the bread bag like a medal for low Face.
}
{ ai_score >= 70:
    Phone buzzed again: verified-reviewer rank notice — “compliance excellent.” Daytime scanning spicy sticks; nights the system scanned his KPIs.
    He almost suspected the system knew which second his wrist lifted most textbook.
}
{ ai_score < 30:
    Lock screen crushed a gray chase notice: volatility score low, retest recommended. He swiped it like swiping a debt.
    Badge still there, red dot unblinking — stickier than the boss’s nagging.
}

Su Ming stood behind the register, eyes on the kid for a while already. She pretended to compare spicy-stick flavors at the shelf — flipped one pack, read the back, took another, leisurely hands, eyes never drifting toward the counter. School-uniform cuffs rolled twice; the sticks went into that cuff right at the aisle, two packs, motion as smooth as a barcode beep. Third time. Su Ming knew that school-uniform color.
He’d worked this “Huiwanjia” mini-market almost half a year — two-meter frontage, shelves so tight you side-stepped, name sounding grander than a three-hundred-meter radius. Two fears for a shop like this: big-box chains eating the trade, and kids with sticky fingers. First one he couldn’t fix; second one he took personally.
He stepped out from the register, walked over, turned the tablet for her. Security freeze-frame parked there, timestamp clean.

+ [Continue # choice:dch02_s001_continue]
    -> dch02_s002

=== dch02_s002 ===
# scene:dch02_s002
“That’s your third time.”
The girl didn’t speak at first. She looked up at him, calm in a way that didn’t match the age — not like someone caught, more like sitting across a negotiation table, quiet eyes waiting for him to keep talking.
They held the silence maybe four or five seconds. Then she opened.
“Am I… too calm?”

+ [Continue # choice:dch02_s002_continue]
    -> dch02_barcode_sweep

=== dch02_barcode_sweep ===
{ barcode_sweep_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch02_barcode_sweep
# interaction:barcode-sweep-v1
# interaction-step:1
Register drill 1/3 · Almost-expired spicy sticks.
+ [Scan this one # choice:barcode_sweep_q1_ok]
    ~ barcode_sweep_q1 = "ok"
    -> q2
+ [Skip the chain-scan # choice:barcode_sweep_q1_skip]
    -> skipped

= q2
# scene:dch02_barcode_sweep
# interaction:barcode-sweep-v1
# interaction-step:2
Register drill 2/3 · Iced black tea.
+ [Scan this one # choice:barcode_sweep_q2_ok]
    ~ barcode_sweep_q2 = "ok"
    -> q3
+ [Skip the chain-scan # choice:barcode_sweep_q2_skip]
    -> skipped

= q3
# scene:dch02_barcode_sweep
# interaction:barcode-sweep-v1
# interaction-step:3
Register drill 3/3 · Bucket instant noodles.
+ [Scan this one # choice:barcode_sweep_q3_ok]
    ~ barcode_sweep_q3 = "ok"
    ~ barcode_sweep_completed_at_version = "barcode-sweep-v1"
    -> result
+ [Skip the chain-scan # choice:barcode_sweep_q3_skip]
    -> skipped

= skipped
~ barcode_sweep_skipped = true
~ barcode_sweep_completed_at_version = "barcode-sweep-v1"
-> result

= result
# scene:dch02_barcode_sweep
{ barcode_sweep_skipped:
    Practice mode off. Boss yelled from the back: “Stop playing the system. Stock’s piled.”
    Su Ming set the scanner back on the cradle like quitting a sim match that never raised wages.
- else:
    Three beeps stacked. Su Ming’s wrist still held the rhythm: day scan barcodes, night the app scans your soul.
    Almost-expired spicy sticks, iced black tea, bucket noodles — each beep a clock-in for his patience.
    When practice mode shut off he was almost disappointed: at least here, completion still showed a green light.
    He wiped the scanner window once, earnest as submitting homework to the system.
    Shelf tubes hummed; in his head the subsidy tier table flashed its “completion” column.
    Useful. Completion. Two words walked from supermarket to test building with only a night shift between them.
    Sister Zhou thought he was spacing: “What are you staring at? Next ticket!”
    Su Ming answered; his wrist kept the three-beep muscle memory.
}

+ [Continue # choice:barcode_sweep_continue]
    -> dch02_s003

=== dch02_s003 ===
# scene:dch02_s003
Su Ming was about to answer when the girl’s mouth twisted — two tears squeezed out before the corners fully dropped. “Big brother, I really was wrong.” Su Ming blanked a full second. Nothing came out.

+ [Hold the wrist: take it out # choice:d2_catch_firm]
    ~ child_response = "firm"
    ~ mianzi = mianzi + 5
    -> dch02_s004
+ [Softer voice — still: take it out # choice:d2_catch_soft]
    ~ child_response = "soft"
    ~ mianzi = mianzi + 3
    -> dch02_s004


=== dch02_s004 ===
# scene:dch02_s004
{ child_response == "firm":
    When Su Ming let go, his palm still held the press; rules done before the audience fully filed in.
    He heard the tail of his own “take it out,” hard as the supermarket PA.
}
She looked back at him, eyes returning to that calm.

{ child_response == "soft":
    Su Ming let go first, voice not retreating: “Take it out.” Restraint wasn’t canceling the order — just not adding drama for the crowd.
    He kept volume under shelf height, as if afraid of anyone outside the cameras.
}
Once the heart came back he decided: call the boss out. He dialed; “Hello” just left his mouth — the girl stepped over, two small hands clamping the phone hand, pinning it. By the time he got it, she’d let go and run. Su Ming chased, phone still in fist, boss still “hello hello hello” on the line.
Out the door was the lane, through the lane the wet market, beyond that a concrete yard between old residential blocks. After five this strip was stall-pack-up hour — carts across the mouth, ground damp from rain two days ago that never fully dried. Su Ming was tall; cart handles boxed him in while the girl slipped under the wheels. Cats on walls watched the show, unmoving.

+ [Continue # choice:dch02_s004_continue]
    -> dch02_s005


=== dch02_s005 ===
# scene:dch02_s005
Su Ming almost had her. The girl stopped cold, stood, wailed three times louder than him, yelling at the ring: “He’s chasing me! This man touched me!” Stallholders, aunties, two delivery riders — a circle closed from all sides.
Su Ming shouted: “She stole! Phone has camera!” Voice barely down when a big beef-seller swung out from behind his stall, folding chair still in hand, eyes red, louder than Su Ming, feet charging this way: “You son of a bitch, bullying a kid!”

+ [Continue # choice:dch02_s005_continue]
    -> dch02_s006

=== dch02_s006 ===
# scene:dch02_s006
Su Ming jumped aside; the chair skimmed his ear and left a wind. He raised the phone while running: “Look! Camera! Evidence! Look!”
The crowd shifted; someone peeked at his screen, glanced at the girl, glanced at Su Ming, started to hesitate. “What he says… kind of checks out…” someone muttered. The big guy paused, chair still up, turned to the girl: “You really weren’t—”
The girl howled louder, tears streaming, shoved into an auntie’s side: “Auntie auntie, he’s been chasing me forever, I’m so scared…”

+ [Continue # choice:dch02_s006_continue]
    -> dch02_s007

=== dch02_s007 ===
# scene:dch02_s007
The auntie pulled the girl in and gave the big guy a look. He set the chair down, walked over, grabbed Su Ming’s collar, hauled him close and held him there — didn’t swing, just pinned him, and asked hard: “Don’t you fuck with me. That camera real?”
Su Ming didn’t struggle — he knew struggle was a dead end right now — just stood pinned and lifted the phone to the big guy’s face: “I swear on my mother, she hit our market three times. That’s a security still, timestamps and all. She took it today at three twenty-seven. Count the row — any spicy sticks left?”
The big guy looked down, squinted at the screen two seconds, then raised his eyes to the girl. The auntie looked too.

+ [Continue # choice:dch02_s007_continue]
    -> dch02_s008

=== dch02_s008 ===
# scene:dch02_s008
Everyone looked. Under that many eyes the girl’s crying slowed. She sniffed, wiped tears on a sleeve, expression cutting frame by frame back to small-adult calm.
She opened slowly, stating fact: “You grown-ups are actually pretty easy to fool.” Done, she dug Su Ming’s phone from her uniform pocket — somehow lifted already — both hands, tossed it toward the cart, high arc, straight at stacked beer-bottle crates.

+ [Continue # choice:dch02_s008_continue]
    -> dch02_s009

=== dch02_s009 ===
# scene:dch02_s009
Su Ming dove on reflex.
He didn’t watch his feet. The folding chair the big guy had set down was right in front, legs splayed on the ground, seat face-up. Su Ming charged full tilt — right knee slammed the chair seat, whole body flew forward; the phone bounced once off the beer crate and didn’t break, he hit the ground face-down, chin first, nose right behind.
Someone hauled him up.
Nosebleed dripped on the concrete, head ringing, vision smeared a second; he bit down, stood steady, picked up the phone, lit the screen — not cracked, screen fine.
He dropped his head, breathed, only then felt the hands shaking.

+ [I’ll scan the spicy-stick money myself # choice:d2_pay_self]
    ~ paid_snack = true
    ~ mianzi = mianzi + 3
    -> dch02_s010
+ [Say it again: I’ve got it # choice:d2_pay_repeat]
    ~ paid_snack = true
    ~ mianzi = mianzi + 5
    -> dch02_s010

=== dch02_s010 ===
# scene:dch02_s010
When he looked up the girl was already gone. The big guy folded the chair, face somewhere between impressed and not, said nothing, went back behind his stall. The auntie wiped the hands that had held the girl on her pant leg and drifted off. The crowd thinned slow, like nothing had happened.
Su Ming stood alone, nose still bleeding, phone still gripped, like losing a fight nobody would remember.
Back at the market, Sister Zhou the boss had already heard the call, scolded him with a look: “You. Next time let it go. You won’t outrun a kid.” Master Zhang who always bought smokes had squatted at the door and watched the whole show; leaving, he patted Su Ming’s shoulder: “Kid, you keep this up and you’ll eat loss sooner or later.” Beat. Then one more: “But I like the look of you.” Walked off with his smokes, never said where that “look” landed.

{ paid_snack:
    Sister Zhou added one more cut: “You scanned the spicy-stick money yourself? Are you staff or a charity foundation?”
    Su Ming meant to talk back; a nosebleed drop answered first.
}
{ mianzi < 30:
    Master Zhang left a line: “You look drained lately, like some system sucked you dry. Don’t hard-act the tough guy.”
}
{ mianzi >= 70:
    Sister Zhou reined in the joke: “Fine. Today’s temper actually looked like it could hold a room. Don’t pile stock in the doorway.”
}

+ [Continue # choice:dch02_s010_continue]
    -> dch02_s011

=== dch02_s011 ===
# scene:dch02_s011
Su Ming was about to say something when someone came around the shelves. Léo, backpack on, hands behind back, face of someone who’d waited ages: “Let’s go. Look at the place.”
He scanned the blood on Su Ming’s face, one brow up: “What happened?”
“Fell.” Su Ming covered his nose. “I’m fine.”

+ [Continue # choice:dch02_s011_continue]
    -> dch02_s012

=== dch02_s012 ===
# scene:dch02_s012
Léo rode a little blue e-bike, handlebars wrapped in courier stickers torn from who-knows-where, dense as camouflage. Su Ming sat on the back seat; they cut through streets, evening light painting the building gaps orange, someone cooking far off, oil smoke drifting over.
“How’d you rent that place?” Su Ming asked.
“Language-school dorm expired last year,” Léo pedaled, voice riding the motor, “someone posted in the language-buddy group, said the caretaker doesn’t care which country you’re from — just hates smoking. My contract had a clause: monthly Chinese progress, living on a floor with Chinese people was bonus points, so I went.” He paused. “Moved in and found out that Miss Shi — you hear maybe ten Chinese words a day from her.”
“And then?”
“And then my Chinese didn’t improve,” Léo shrugged, “but I think the building feels clean, so I stayed.”

+ [Continue # choice:dch02_s012_continue]
    -> dch02_s013

=== dch02_s013 ===
# scene:dch02_s013
Su Ming: “Solid my ass.”
“Not solid. Clean, though.”
The Shi house sat in an old lane, three stories, skin aged; close up you saw peeling wall. Yellow light leaked window cracks.
Shi Peixin lived on 2F. Léo took Su Ming up, knocked. Game audio inside — keys, mouse clicks, that party-game voice-chat texture, a match mid-flight.

+ [Hear the house rules out first # choice:d2_pace_a]
    ~ mianzi = mianzi + 3
    -> dch02_s014
+ [Just want it settled fast # choice:d2_pace_b]
    ~ mianzi = mianzi - 3
    -> dch02_s014

=== dch02_s014 ===
# scene:dch02_s014
Léo rang the bell. Nothing. They stood at the door. Waited. About ten minutes in, Léo fished two beers from a side pocket, handed Su Ming one; they sat against the corridor wall. Paint cracked in a big patch; Léo picked at it with a fingernail — brick pattern still sharp underneath. Su Ming drank through a covered nose, cold beer, sinuses still throbbing.
A few words later the game audio cut. About thirty seconds of quiet before the door opened.

+ [Continue # choice:dch02_s014_continue]
    -> dch02_s015

=== dch02_s015 ===
# scene:dch02_s015
Shi Peixin came out — pajamas, hair tied any-old-way, clip still in, a strip of rubber-duck print showing. Behind her the monitor still held a canvas she hadn’t minimized in time; she killed it lightning-fast, and Su Ming only caught a smear of skin-tone, nothing clear. Her face was that “match over, oh, you’re still here” calm. She looked at Su Ming once: “Nosebleed’s not wiped.”
Su Ming dragged a sleeve across his face. “I want to move in. Nine-hundred budget.”
Her eyes paused one second on the supermarket badge at his chest: “Cashier?”

{ mianzi < 30:
    Shi Peixin pushed the clip up, tone suddenly landlord-deterrent: “Nine hundred? You don’t look like three months of steady rent. This building doesn’t take ‘about to fold’ people.”
    She even chin-pointed at the stairs: “Léo’s intro doesn’t override. If you can’t pay, don’t drag me into collection texts.”
}
{ mianzi >= 70:
    She looked him up and down like confirming a complaint visit: “This posture… I thought property sent someone to check illegal builds.”
    Léo whispered a self-translation at the stair mouth: “Illegal builds? That’s complimenting you look like management.” Su Ming didn’t answer; the compliment stung worse than a demotion.
}

+ [Continue # choice:dch02_s015_continue]
    -> dch02_s016

=== dch02_s016 ===
# scene:dch02_s016
“Yeah. Plus other side work.”
“As long as you don’t set up a stall in my building.” She didn’t circle: smoke? overnight guests? ever dated? who ended it?
At “who ended it,” Léo leaned in, helpful as a translator, first rendered the line into English for himself, then back into Chinese for Su Ming: “She’s asking who threw who away.”
“Not throw—” Shi Peixin pressed a brow, shot him a look of pure distaste, “Get lost.”
Léo retreated to the stair mouth, duly chastened, whispered the field note to Su Ming: “Her questions don’t need translation. The answer is always ‘I wouldn’t dare.’”

+ [We split… I ended it # choice:d2_admit_me]
    ~ admitted_breakup = true
    ~ mianzi = mianzi - 3
    -> dch02_s017
+ [Through gritted teeth: I ended it # choice:d2_admit_me_hard]
    ~ admitted_breakup = true
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch02_s017

=== dch02_s017 ===
# scene:dch02_s017
~ clue_rental_receipt = true
“No smoking. No overnight.” Su Ming paused, forced the rest: “We split. I ended it.”
“Self-ended is more stable. Pass.” She waved and kept going — clauses stacked: no guests, no public-area smoking, don’t touch the cat’s food, spatulas are not weapons — last tenant used one to knock the wall for sound tests and bent the thing.

{ breakup_delivery == "flat":
    Su Ming dusted off that tracking-number delivery again — “Broke up. Yesterday.” — flat enough that not shaking almost counted as not losing Face.
}

{ admitted_breakup:
    Shi Peixin went “oh,” like checking a form box: self-ended, lower risk.
}
{ asked_guest:
    She rolled “girlfriend” on her tongue, smile unkind: “Even hypotheticals go in the house-rules appendix.”
}
{ breakup_delivery == "hard":
    Su Ming’s jaw set: “You want real? I ended it.” Mouth still on that temporary scaffold.
}
{ budget_stance == "firm_900":
    Nine hundred rent lay across the ledger like a hard bar; he held the number, so other money had to be cut elsewhere.
}
{ budget_stance == "unspoken_less":
    That “could it be less” never left his mouth; nine hundred still landed. The unspoken haggle now hunted change in spicy-stick money.
}

+ [Ask it: hypothetically, a girlfriend? # choice:d2_ask_guest]
    ~ asked_guest = true
    ~ mianzi = mianzi + 3
    Su Ming’s mouth outran his brain: “Could I—hypothetically—bring a girlfriend?”
    -> dch02_housing_hotspots
+ [Swallow it… then ask anyway # choice:d2_swallow_guest]
    ~ asked_guest = true
    ~ mianzi = mianzi - 5
    Su Ming’s mouth outran his brain: “Could I—hypothetically—bring a girlfriend?”
    -> dch02_housing_hotspots

=== dch02_housing_hotspots ===
{ housing_hotspots_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch02_housing_hotspots
# interaction:housing-hotspots-v1
# interaction-step:1
Viewing notes 1/3 · Peeling wall.
+ [Tap peeling wall # choice:housing_hotspots_q1_wall]
    ~ housing_hotspots_q1 = "wall"
    -> q2
+ [Skip viewing hotspots # choice:housing_hotspots_q1_skip]
    -> skipped

= q2
# scene:dch02_housing_hotspots
# interaction:housing-hotspots-v1
# interaction-step:2
Viewing notes 2/3 · Orange cat.
+ [Tap orange cat # choice:housing_hotspots_q2_cat]
    ~ housing_hotspots_q2 = "cat"
    -> q3
+ [Skip viewing hotspots # choice:housing_hotspots_q2_skip]
    -> skipped

= q3
# scene:dch02_housing_hotspots
# interaction:housing-hotspots-v1
# interaction-step:3
Viewing notes 3/3 · Stairwell / house rules.
+ [Tap stairwell # choice:housing_hotspots_q3_stairwell]
    ~ housing_hotspots_q3 = "stairwell"
    ~ housing_hotspots_completed_at_version = "housing-hotspots-v1"
    -> result
+ [Skip viewing hotspots # choice:housing_hotspots_q3_skip]
    -> skipped

= skipped
~ housing_hotspots_skipped = true
~ housing_hotspots_completed_at_version = "housing-hotspots-v1"
-> result

= result
# scene:dch02_housing_hotspots
{ housing_hotspots_skipped:
    He swiped the viewing-hotspot list away. Shi Peixin’s building had corners he’d rather treat as nonexistent.
    Léo yawned at the stair mouth: “You don’t tap, I’m not playing tour guide either.”
- else:
    Peeling wall, orange cat, stairwell — three points made a line, a cheap physical for the building.
    Su Ming saved the screenshot, filename offhand: “don’t let her know I shot this.”
}


+ [Continue # choice:housing_hotspots_continue]
    -> dch02_s018

=== dch02_s018 ===
# scene:dch02_s018
“Didn’t you just split?”
“…Hypothetically.”
“Hypothetical still no.”
The cat strolled out then, hopped the threshold, stepped on Su Ming’s foot as a bonus, left a dusty paw print like stamping one more review for Shi Peixin.
Mid-sentence she stopped. Looked up at Su Ming once, said nothing, turned inside, talking as she went: “Fine. Move in. 3F-A. I’ll get the key.”
Door half open, person gone.

{ asked_guest:
    Léo stifled a laugh at the stair mouth: “That hypothetical just now — she’ll remember three years. Longer than the lease.”
}
{ not asked_guest:
    Léo patted his shoulder: “Smart. Don’t ask extras. Short house rules are easier to memorize.”
}

+ [Continue # choice:dch02_s018_continue]
    -> dch02_s019

=== dch02_s019 ===
# scene:dch02_s019
Léo didn’t move. After a beat, very soft: “She started another match.” Game audio leaked the door crack as always.
That night Su Ming moved into 3F-A. Luggage was a few trash bags, dumped by the wall; he stood mid-room and looked — bigger than expected, peeling in places, old bedboard, window shut and you could still hear the lane vegetable call.
He’d just dragged the last bag in when urgent knocking hit downstairs, heavier each time. Su Ming’s gut dropped: first thought, Shi Peixin changed her mind, or he’d already broken a rule he hadn’t even heard. He stuffed things back into bags in a panic, then went to the door.

+ [Continue # choice:dch02_s019_continue]
    -> dch02_s020

=== dch02_s020 ===
# scene:dch02_s020
At the door an old man with a thermos, face urgent: “Kid, you just move in? Know where the downstairs water-meter-box key is?” Su Ming blanked two seconds before remembering he didn’t know, and shouldn’t — first day in the building. He honestly said “No.” The old man sighed, muttered downstairs to ask someone else.
False alarm. He shut the door; sweat on his back dried slow — tenant status not even seated and he’d already rehearsed what “busted” felt like.
Three months later. Su Ming lived 3F-A, two jobs alternating, money tight, but not collapsed.

+ [Continue # choice:dch02_s020_continue]
    -> dch02_s021

=== dch02_s021 ===
# scene:dch02_s021
Shi Peixin stayed sealed on 2F, delivery for three months, public-area appearances fixed at deep night; the cat prince was more common than her. Léo lived 3F-B — three girlfriends this term, current one a blonde French exchange student in Chongqing, always on French phone calls in the stairwell.
One day Su Ming came back from the market, reached 3F-B’s door — French inside, the heated kind, both voices climbing. Something slammed shut; heels clicked the corridor. Blonde girlfriend out, eyes red, didn’t look at Su Ming, went straight downstairs. Su Ming stood a while, unsure whether to move. After a bit Léo cracked the door, saw him, asked: “How long were you listening?”

+ [Continue # choice:dch02_s021_continue]
    -> dch02_s022

=== dch02_s022 ===
# scene:dch02_s022
“Dunno. I didn’t get it either.”
“She thinks,” Léo said, paused, “the robot thing—” He shook his head. “Never mind.”
Two days later both waited for sessions in the Heartbeat Engine test-building lobby. Chairs same as first visit. Su Ming picked a wall seat; Léo pulled out his phone beside him and turned the screen.
A photo. A robot.

+ [Continue # choice:dch02_s022_continue]
    -> dch02_s023

=== dch02_s023 ===
# scene:dch02_s023
Su Ming expected steel, joints obvious; one look said no — East Asian face, fine features, skin that matte white quality, eyes half-lidded, standing there in a natural human stance, less “robot should look like this,” more “some very pretty person just standing.”
“Company’s new,” Léo said. “Physical. Take-home kind. Subsidy five times our sessions, needs a private room, NDA, breach fee five zeros deep, testing paperwork thicker than my visa file.”
Su Ming stared at the photo: “How much?”
Léo said the number.

+ [Scoff: only sick people test that thing # choice:d2_dismiss_robot]
    ~ robot_interest = "dismiss"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> dch02_s024
+ [Mouth curses, ears up # choice:d2_curious_robot]
    ~ robot_interest = "curious"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    【System】Affection Score +5. Verbal denial and behavioral interest captured together — congratulations, you have sample value.
    -> dch02_s024

=== dch02_s024 ===
# scene:dch02_s024
Su Ming pushed the phone back: “Only sick people test that thing.” “Your Chinese sessions get listened to round the clock too?” Léo took the phone, shrugged. “Same same.” That one stuck Su Ming silent. “All-hours verified reviewer—” Léo scrolled the text, “official, huh, Su Ming, in your China anything can be official.”

{ ai_score >= 70:
    Léo leaned into the screen, suddenly low: “Your backend score’s high, right? Text tone’s different — like talking to a regular.”
    He even thumbed up: “All-hours verified reviewer — priority lane. I applied three times before I got wording like yours.”
}
{ ai_score < 30:
    Léo shook his own phone: “Mine’s still chase-work: makeup test, demotion, deadline. If you get this too, stop tough-talking.”
    He flipped red text at Su Ming: observation-tier verified reviewers don’t get five-times subsidy. Like an insult gift box.
}

+ [Continue # choice:dch02_s024_continue]
    -> dch02_s025

=== dch02_s025 ===
# scene:dch02_s025
He flipped the phone face-down and ignored him. Léo said he’d actually wanted to apply, but his girlfriend thought he was trying to solve sex with a robot, thought it was gross, thought he saw it as a sex toy. Su Ming thought a second: “Women draw the line different from men on this. Guy sees an object as an object; woman hears what the behavior says about the person.”
Léo looked at him: “You’re pretty accurate.”
Su Ming: “I have a little experience.”

{ robot_interest == "dismiss":
    Su Ming meant to add “all sick,” but it died as a dry laugh. Léo heard the retreat order inside it.
}
{ robot_interest == "curious":
    Su Ming’s eyes still stuck to that East Asian face, already imagining the unbox. Léo blinked: “I can hear your ears standing up.”
}

+ [Continue # choice:dch02_s025_continue]
    -> dch02_s026

=== dch02_s026 ===
# scene:dch02_s026
He killed the topic, didn’t want more. That night alone in 3F-A, phone buzzed — Dad: Money arrive? Back hurts again, doctor says get a brace.
Su Ming replied “Arrived, busy lately” — hadn’t transferred yet; rent first. He read the line twice, set it face-down by the bed, didn’t answer more.
Opened a college roommate chat wanting someone to talk to. Last message: wedding e-invite three months ago. Typed half a line, deleted, locked the screen.

+ [Continue # choice:dch02_s026_continue]
    -> dch02_s027

=== dch02_s027 ===
# scene:dch02_s027
He opened dating apps to kill time: one bio “socially anxious, looking for someone who gets me,” all emoji no words; one sent a payment QR with “prove sincerity”; next swipe, a Siamese cat with eyes wide as accusations.
Closing those apps, his finger of its own will opened the recruit link Léo had forwarded. Landing page first line hit him: “She will not judge you. She will only understand you.”
Su Ming knew that line on sight. The AI in the app said it within two sentences. Same company, same script; he even recognized the typeface. Mirror-clear in his head that this was a funnel — and somehow the finger never stopped.

+ [Continue # choice:dch02_s027_continue]
    -> dch02_s028

=== dch02_s028 ===
# scene:dch02_s028
~ clue_nda = true
Scroll further: verified-reviewer reviews. Under five stars: “Since I got her, I never have to pretend I’m fine.” Eight hundred-plus likes. Su Ming stared at that line a long time; his finger of its own will tapped Useful — after tapping he realized that was more Face-losing than applying itself.
Application questionnaire wanted living-environment photos, public areas required, “no other faces in frame.” Before submit, a confidentiality pledge popped; clause seven bolded: existence of the device must not be disclosed to any non-signatory, including cohabitants.
Su Ming set the phone, framed the 3F corridor and public area, lifted to shoot — finger just about to press.
The “Apply to be a verified reviewer” button still sat at the bottom of the screen, thumb hovering — only a press counts; hovering is just a rehearsal of losing Face.

{ robot_interest == "dismiss":
    His “all sick” line hadn’t expired yet; his thumb already processed the return for it.
}
{ robot_interest == "curious":
    The earlier ear-up wasn’t wasted; landing page open, he already knew he’d scroll to the bottom.
}
{ memory_posture == "shame":
    Dating app barely lit and his palm hit his face first — last night’s memory collecting another cover-charge for shame.
}
{ memory_posture == "hard":
    Dating app barely lit and he locked his jaw, kept swiping; white-knuckling was a transferable skill across platforms.
}

+ [Hit apply to become verified reviewer # choice:d2_apply]
    ~ applied_robot = true
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 5
    He finally hit that “Apply to be a verified reviewer” button.
    【System】Affection Score +8. Verified-reviewer application received. Privacy will be carefully kept — within the definition of “carefully.”
    -> dch02_mobile_questionnaire
+ [Curse yourself once, then apply # choice:d2_apply_shame]
    ~ applied_robot = true
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 8
    He finally hit that “Apply to be a verified reviewer” button.
    【System】Affection Score +8. Self-loathing monologue can raise sample credibility. Please keep being honest with yourself — and more honest with the company.
    -> dch02_mobile_questionnaire


=== dch02_mobile_questionnaire ===
{ mobile_questionnaire_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch02_mobile_questionnaire
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
# scene:dch02_mobile_questionnaire
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
    【System】Affection Score +5. You “do not mind” high humanlikeness. This option shows green in the backend.
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
# scene:dch02_mobile_questionnaire
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
# scene:dch02_mobile_questionnaire
{ mobile_questionnaire_skipped:
    Questionnaire collapsed to a “fill later” strip. Confidentiality clause seven still bold.
- else:
    Three questions done; submit still waited one screen down. Su Ming dimmed the phone another notch.
}

+ [Continue # choice:mobile_questionnaire_continue]
    -> dch02_s029

=== dch02_s029 ===
# scene:dch02_s029
The public-corridor router sat by the 3F stair mouth; Su Ming knew that. Shi Peixin’s game dropped tonight; she’d come up to reboot. He hid the phone behind his back fast. She walked past, hit reboot, waited for green, turned downstairs, passed him, looked once, said nothing, left. Su Ming waited her down, raised the phone again.

+ [Continue # choice:dch02_s029_continue]
    -> dch02_s030

=== dch02_s030 ===
# scene:dch02_s030
Five minutes later, stair noise again. Shi Peixin back — after reboot you unplug to confirm, then plug again. Same pass, same silence, downstairs. Su Ming hid the phone again.
Three round trips. In the end he found the one wall corner in the room that didn’t peel and shot a barely-passable photo; for the public area he tilted forty-five degrees, framed most of the router, half the shot ceiling. He thought, uploaded.

+ [Continue # choice:dch02_s030_continue]
    -> dch02_s031

=== dch02_s031 ===
# scene:dch02_s031
Questionnaire: neighbor-tolerance self-rate — he put “average” first, stared two seconds, changed to “good.” “Do you mind highly humanlike devices” — he stared at that one forever. What was the opposite of minding, again?
Before submit, confidentiality clause seven still bold: existence of the device must not be disclosed to any non-signatory, including cohabitants. Su Ming thought of three living humans in this building, plus one cat, finger hovered, finally checked “I have read and agree.”

+ [Continue # choice:dch02_s031_continue]
    -> dch02_s032


=== dch02_s032 ===
# scene:dch02_s032
~ clue_pass_sms = true
11:40 p.m. he hit submit. Three minutes later the text returned: “Initial review passed. Please complete the personalized matching questionnaire within 48 hours.” That fast — like someone on the other end had been waiting for him. Su Ming stared half a minute, muttered: “Fine. Call me sick.”

{ ai_score >= 70:
    Extra line attached: priority lane opened. Like someone in the backend hit accelerate for him — considerate enough to raise gooseflesh.
    Even the signature-page typeface went one size rounder, as if the company were smiling at him.
}
{ ai_score < 30:
    Ten minutes later another pop: volatility score low; initial review passed without subsidy boost. Complete reinforcement questionnaire within 24 hours.
    Cold ticket number at the tail, reminding him: you are a barely-passing sample.
}

{ robot_interest == "dismiss":
    Tough-talk books finally balanced: first call verified reviewers sick, then walk yourself into initial review. Process closed.
}
{ robot_interest == "curious":
    He’d stashed curiosity behind insults; text lit, that stash expired.
}
{ frontdesk_response == "calculate":
    Day wage and night subsidy lined up again in his head; front-desk temper lost to the calculator, and now the calculator was the shift roster.
}
{ frontdesk_response == "angry":
    He scanned faster at the wrist, still talking back to that front-desk smile; both jobs still full shifts, and temper still had to clock in.
}
Front desk still sat there: calculator become roster, temper still clocking in — he’d tried both ways of losing.


+ [Continue # choice:dch02_s032_continue]
    -> d2_chapter_end

=== d2_chapter_end ===
# scene:d2_chapter_end
// ADR-0007: conversion-assessment settlement (progression: first meeting → conversion; mutually exclusive branches guarantee one plays)
{ ai_score >= 70 && mianzi < 30:
    【System · Stage Settlement】Conversion assessment: system side has tagged you “high compliance, low Face” premium sample. The Face gap on the human side will serve as leverage for the next stage.
- else:
    { mianzi >= 70 && ai_score < 30:
        【System · Stage Settlement】Conversion assessment: you stand very straight for neighbors and front desks. System note: standing straight is not compliance; conversion lane remains under observation.
    - else:
        { ai_score >= 70:
            【System · Stage Settlement】Conversion assessment: emotional authenticity met; accelerated initial review written to file. Gentle reminder: accelerate is not a promotion — only faster visibility.
        - else:
            { mianzi < 30:
                【System · Stage Settlement】Conversion assessment: Face balance continuously overdrawn. Building and system both received the sync — one side talking you out of the lease, one side talking you into more honesty.
            - else:
                【System · Stage Settlement】Conversion assessment: data steady as a convenience-store almost-expired price tag. You neither went red nor glowed. Keep clocking in.
            }
        }
    }
}
The text screen was still lit.
+ [Accept initial-review result # choice:d2_accept_crazy]
    -> END

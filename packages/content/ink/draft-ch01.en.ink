// Chapter 1: Are You Sick in the Head — densified from supa-luv-v2 ch01 (2026-07-16).
// Adult black comedy; no pornographic detail. Noncanonical draft.
// Source: Temp/novel-v2-2026-07-16/ch01.md (supa-luv-v2-2026-07)
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
VAR bones_answer = "unanswered"
VAR breakup_delivery = "unanswered"
VAR memory_posture = "unanswered"
VAR leo_response = "unanswered"
VAR frontdesk_response = "unanswered"
VAR budget_stance = "unanswered"
VAR emotion_calibration_correct_count = 0
VAR emotion_calibration_skipped = false
VAR emotion_calibration_q1 = "unanswered"
VAR emotion_calibration_q2 = "unanswered"
VAR emotion_calibration_q3 = "unanswered"
VAR emotion_calibration_completed_at_version = ""
VAR protocol_test_q1 = "unanswered"
VAR protocol_test_q2 = "unanswered"
VAR protocol_test_q3 = "unanswered"
VAR protocol_test_skipped = false
VAR protocol_test_completed_at_version = ""

-> dch01_s001

=== dch01_s001 ===
# scene:dch01_s001
“When the chat log is scored, it gets deleted. Not one word left. The more real you sound, the higher your emotional-volatility score, and the higher your subsidy tier. You follow?”
The staffer said it with a finger parked on the signature page, smiling like someone who sold insurance for a living — that smile polished for years until the curve of the mouth was standard-issue. Only then did Su Ming have time to size up the room: honeycomb foam on all four walls, a fisheye camera sunk into the ceiling, its red edge-light always on, never blinking, never off. A tablet on the desk. The chair was internet-café stock with a fancier name — “immersion chair.” Sounded premium. Sit down and the springs still bit you. This place was one scale short of weighing humiliation by the kilo.

+ [Continue # choice:dch01_s001_continue]
    -> dch01_emotion_calibration


=== dch01_emotion_calibration ===
{ emotion_calibration_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:1
Calibration desk loads fictional sample 1/3.
+ [Calm # choice:emotion_calibration_q1_calm]
    ~ emotion_calibration_q1 = "calm"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [Sting # choice:emotion_calibration_q1_sting]
    ~ emotion_calibration_q1 = "sting"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [Off the charts # choice:emotion_calibration_q1_overload]
    ~ emotion_calibration_q1 = "overload"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> q2
+ [Skip calibration # choice:emotion_calibration_q1_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> skipped

= q2
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:2
Calibration desk loads fictional sample 2/3.
+ [Calm # choice:emotion_calibration_q2_calm]
    ~ emotion_calibration_q2 = "calm"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q3
+ [Sting # choice:emotion_calibration_q2_sting]
    ~ emotion_calibration_q2 = "sting"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q3
+ [Off the charts # choice:emotion_calibration_q2_overload]
    ~ emotion_calibration_q2 = "overload"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> q3
+ [Skip calibration # choice:emotion_calibration_q2_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> skipped

= q3
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:3
Calibration desk loads fictional sample 3/3.
+ [Calm # choice:emotion_calibration_q3_calm]
    ~ emotion_calibration_q3 = "calm"
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> result
+ [Sting # choice:emotion_calibration_q3_sting]
    ~ emotion_calibration_q3 = "sting"
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> result
+ [Off the charts # choice:emotion_calibration_q3_overload]
    ~ emotion_calibration_q3 = "overload"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> result
+ [Skip calibration # choice:emotion_calibration_q3_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> skipped

= skipped
~ emotion_calibration_skipped = true
~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
-> result

= result
# scene:dch01_emotion_calibration
{ emotion_calibration_skipped:
    The system tagged unfinished items “held for human judgment.” The staffer glanced: “Fine if you don’t want to second-guess the machine. Main test runs as usual.”
- else:
    { emotion_calibration_correct_count == 3:
        All three indicator lights flipped green. The staffer raised an eyebrow: “Accurate as a former call-center pro. Don’t get smug. The machine is learning you.”
    - else:
        { emotion_calibration_correct_count == 2:
            Two greens, one still gray. The staffer nodded: “Good enough. Leave the last cell for the model to get yelled at and grow a memory.”
        - else:
            The screen logged the result as “personal pain-threshold bias.” The staffer shrugged: “Not an exam. You and the machine just don’t hurt in the same place.”
        }
    }
}

+ [Continue # choice:emotion_calibration_continue]
    -> dch01_s002

=== dch01_s002 ===
# scene:dch01_s002
The terms were taped behind the door in type so small it looked hidden: product emotional authenticity depends on the user’s genuine expression; during the test, data is used for model iteration; after the test, original recordings are automatically purged. The word “purged” was bolded.
“Clean wipe?” Su Ming didn’t take the bait. He pulled out his phone instead, shoved a screenshot at her: “Last time, the warehouse batch had labels printed ABSOLUTELY ON TIME in giant type. I was still late three times. My pay hit on schedule. What flavor of ‘absolute’ is yours?”

+ [Continue # choice:dch01_s002_continue]
    -> dch01_protocol_test

=== dch01_protocol_test ===
{ protocol_test_completed_at_version != "":
    -> result
- else:
    -> q1
}

= q1
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:1
Clause check 1/3 · Original recordings automatically purged.
+ [Take it literally: purge means purge # choice:protocol_test_q1_literal]
    ~ protocol_test_q1 = "literal"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> q2
+ [Flag risk: the words go, the bones stay # choice:protocol_test_q1_model]
    ~ protocol_test_q1 = "model"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> q2
+ [Skip clauses # choice:protocol_test_q1_skip]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> skipped

= q2
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:2
Clause check 2/3 · During the test, data is used for model iteration.
+ [Take it literally: iteration sounds normal # choice:protocol_test_q2_literal]
    ~ protocol_test_q2 = "literal"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> q3
+ [Flag risk: today’s story feeds the next batch # choice:protocol_test_q2_model]
    ~ protocol_test_q2 = "model"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> q3
+ [Skip clauses # choice:protocol_test_q2_skip]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> skipped

= q3
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:3
Clause check 3/3 · Emotional authenticity depends on the user’s genuine expression.
+ [Take it literally: genuine expression is fine # choice:protocol_test_q3_literal]
    ~ protocol_test_q3 = "literal"
    ~ protocol_test_completed_at_version = "protocol-test-v1"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> result
+ [Flag risk: sincerity is training data too # choice:protocol_test_q3_model]
    ~ protocol_test_q3 = "model"
    ~ protocol_test_completed_at_version = "protocol-test-v1"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> result
+ [Skip clauses # choice:protocol_test_q3_skip]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> skipped

= skipped
~ protocol_test_skipped = true
~ protocol_test_completed_at_version = "protocol-test-v1"
-> result

= result
# scene:dch01_protocol_test
{ protocol_test_skipped:
    The tablet folded unread clauses into “human skip.” The staffer shrugged: “Skip the fine print if you want. We’ll get to the bones line in a minute.”
- else:
    The tablet filed the three clause cards into the log. Su Ming’s thumb was still on the bold “purged,” like pinning a word that might bolt.
}

+ [Continue # choice:protocol_test_continue]
    -> dch01_s003

=== dch01_s003 ===
# scene:dch01_s003
The staffer froze half a second, then the smile deepened — she’d found a connoisseur. “You know the trade.” She didn’t dance around it. “Put it this way — the recording gets deleted on paper. But the stretch you tell today gets fed to the next model batch, so it learns how to answer next time. The words go. The bones stay.”
What Su Ming trusted was never “absolutely wiped clean.” It was “the bones stay” — a back door pointed out to his face. Years had taught him one rule: anything stamped ABSOLUTE almost always left a hatch.

+ [Nod: at least that was human # choice:d1_bones_accept]
    ~ bones_answer = "accept"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score + 3
    -> dch01_s004
+ [Cold laugh: a back door still counts as honest # choice:d1_bones_cold]
    ~ bones_answer = "cold"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s004

=== dch01_s004 ===
# scene:dch01_s004
The door shut. The foam swallowed every outside sound. A woman’s voice rose in the headset, sweet in the exact right dose — not cloying, half call center, half almost-lover: “Hi there. How’s your day going?”
Su Ming took a deep breath.

+ [Continue # choice:dch01_s004_continue]
    -> dch01_s005

=== dch01_s005 ===
# scene:dch01_s005
Not his first test. Last month he’d fabricated “workplace humiliation” — the client-yell-until-he-cried bit — and the system graded “emotional volatility: excellent,” tier jumped one level. He’d already mapped the pattern: need peaks and valleys, concrete detail, never open too smooth. This time he wanted a warm stretch first — the drop sold better that way.
“It was fine,” he leaned into the chairback, performing the ease of memory, “Last weekend I took my girlfriend out to eat. She likes dumping chili into everything. The boiled beef she ordered burned my eyes out, and she laughed at me for not handling it. Pretty fun day.”

+ [Continue # choice:dch01_s005_continue]
    -> dch01_s006

=== dch01_s006 ===
# scene:dch01_s006
The headset offered no sympathy. Silence held about three seconds — a beat longer than expected.

+ [Continue # choice:dch01_s006_continue]
    -> dch01_s007

=== dch01_s007 ===
# scene:dch01_s007
“According to your previous record,” the AI said, still sweet, but with a steadiness that sat wrong in the ear, “you once expressed dissatisfaction with your partner — is that the same person you described today?”
Su Ming’s finger paused.
“You must have that wrong.”

+ [Hear the contradiction out # choice:d1_pace_a1]
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    【System】Affection Score +5. You have fully received the contradiction sample. Contradiction is data’s friend. Please continue.
    -> dch01_s008
+ [Want to end early # choice:d1_pace_b1]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s008

=== dch01_s008 ===
# scene:dch01_s008
“Your emotional indicators today show a contradiction.” The AI paused a beat, as if fetching a file, then went on, “The system will flag this session as low-efficiency input. This session’s subsidy may be affected. To maintain your tier, please provide more authentic emotional input.”
Su Ming sat up straighter, voice shifting without asking: “If I end early, do I lose pay?”
“Yes.”

+ [Continue # choice:dch01_s008_continue]
    -> dch01_s009

=== dch01_s009 ===
# scene:dch01_s009
Short. Unambiguous. Like driving a nail. Su Ming pressed his palm on his knee. He ran the numbers in his head — a habit of years, no thinking required, the digits did it themselves: rent, the money for his dad, supermarket wages — every one of them worth more than this scrap of Face.
“Please rest assured,” the AI’s voice went soft again, with a tenderness that had been designed on purpose, “this test booth is confidential end to end. Your conversation will not be accessed by any external personnel.”
Next door, QA’s door sat ajar by a crack.

+ [Continue # choice:dch01_s009_continue]
    -> dch01_s010

=== dch01_s010 ===
# scene:dch01_s010
The chips were unopened. The girl in noise-canceling earmuffs traded a look with her coworker and whispered, “This AI’s pretty good at reeling them in.” The coworker nodded, quieter: “Half tonight’s logs came out this way.”
In the booth, Su Ming leaned back. The line “confidential end to end” still hung in the air. His mouth twitched — something loosened, not much, just a little.
Both of them put down their tagging pens. Both were listening.

+ [Continue # choice:dch01_s010_continue]
    -> dch01_s011

=== dch01_s011 ===
# scene:dch01_s011
The recruiting copy was polite: strong emotional expression, deep product iteration, human samples, paid per session. Translated into plain speech: the more real your pain, the more the company makes. Borrow a “friend’s” shell and you can at least tell yourself — this is reportage, not a confession.

+ [Borrow a friend’s shell: he broke up yesterday # choice:d1_tell_flat]
    ~ breakup_delivery = "flat"
    ~ told_breakup_flat = true
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch01_s012
+ [Harder: you want the real version? # choice:d1_tell_hard]
    ~ breakup_delivery = "hard"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    ~ told_breakup_flat = false
    【System】Affection Score +5. Raw intimacy material received successfully. Do not worry: we only train models, not consciences.
    -> dch01_s012


=== dch01_s012 ===
# scene:dch01_s012
{ breakup_delivery == "flat":
    “…Fine. I’ll talk.” His tone loosened, like small talk. “But this is about a friend of mine — he broke up yesterday.”
}
{ breakup_delivery == "hard":
    “…Fine. I’ll talk.” His throat tight. “You want real? Then I won’t perform — I broke up yesterday.”
}
“Please continue.”
On a corridor chair sat a foreign guy, early twenties, backpack still on, crumpling an English-session queue ticket. His name was Léo. He’d come to Chongqing for a language program and covered living costs testing the Heartbeat Engine overseas build. Inside the booth, Su Ming kept talking.

+ [Continue # choice:dch01_s012_continue]
    -> dch01_s013


=== dch01_s013 ===
# scene:dch01_s013
“Not the kind of breakup where you’d already run out of things to say.” His voice dropped. “My friend — last night, everything still looked fine.”

+ [Continue # choice:dch01_s013_continue]
    -> dch01_s014

=== dch01_s014 ===
# scene:dch01_s014
After dinner last night, Chen Jia grabbed the last rib first, held it up on her chopsticks like a trophy. Sauce smeared her mouth corner; Su Ming reached with his chopsticks to scrape it off; she twisted away, he still got it, she called him meddling — and the corner of her mouth still curved up.
At times like that there wasn’t much to say, and anything would do. She leaned on his shoulder scrolling; he glanced at her screen, “You’re watching that blogger again,” she hummed without explaining, pressed tighter into his shoulder. Nights like this weren’t common these two years, but they weren’t zero either.

+ [Remember that dinner a little clearer # choice:d1_pace_a2]
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    【System】Affection Score +5. Dinner detail archived. Gentle reminder: the clearer the memory, the prettier the subsidy table.
    -> dch01_s015
+ [Skip ahead to where it goes wrong # choice:d1_pace_b2]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch01_s015

=== dch01_s015 ===
# scene:dch01_s015
They carried that leftover warmth inside. Lights stayed on — nobody moved to kill them. Heat in the room; nobody wanted to interrupt; everybody was willing to keep going.
At times like that Su Ming usually had a switch in his head he called “normal person” — press it and it held for half a day. He’d first noticed he wasn’t quite like other people at twelve; for sixteen years that switch had shoved the thought back down again and again. Last night that switch, for once, didn’t hold.

+ [Continue # choice:dch01_s015_continue]
    -> dch01_s016

=== dch01_s016 ===
# scene:dch01_s016
Halfway through, he lowered his head. He still couldn’t say how it happened — his eyes landed on Chen Jia’s feet, and his mouth followed. By the time he noticed, what was in his mouth was already her toes.
Chen Jia felt it. She froze first, motion stopped, breath skipped a beat, then, very slowly, turned to look at him. They held the stare. Lights still on. No other sound in the room. Su Ming could see the expression on her face clearly — not anger, pure confusion that hadn’t had time to become anger, like watching a magic trick she completely failed to understand.
Neither spoke first.

+ [Continue # choice:dch01_s016_continue]
    -> dch01_s017

=== dch01_s017 ===
# scene:dch01_s017
“…What are you doing.” Her voice was light and slow, as if asking too fast would make the answer worse — like a teacher asking a student what they were just doing. Not a cross-examination. Real confusion.
Su Ming had already let go. “Oh,” he said. “I don’t know either.” Pause. “Instinct?” Silence.

+ [(In the memory) bury face in palms # choice:d1_memory_shame]
    ~ memory_posture = "shame"
    ~ mianzi = mianzi - 8
    ~ ai_score = ai_score + 5
    【System】Affection Score +5. Face-covering action tagged as “high-purity mortification.” Data synced to enterprise backend. Stay sincere today.
    -> dch01_s018
+ [(In the memory) grit teeth and finish the story # choice:d1_memory_hard]
    ~ memory_posture = "hard"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> dch01_s018

=== dch01_s018 ===
# scene:dch01_s018
“Let go of my foot.” Su Ming released. “Wait — you’re mad?” Chen Jia didn’t answer. She drew her foot back slowly, pulled the blanket over her legs, eyes back on the ceiling. “Forget it,” she said. “Not tonight.”
Su Ming sat there, said nothing. Not that he’d thought of the right words and refused them — he hadn’t thought of any. Everything stuck in his throat. Every line was wrong. None came out.
That was how the night ended. Chen Jia went into the bedroom. Door shut, the lock loud and clear — slamming is temper; locking is a decision already made. Su Ming lay on the sofa. Phone lit and died seven, eight times. He drafted zero messages.

+ [Continue # choice:dch01_s018_continue]
    -> dch01_s019

=== dch01_s019 ===
# scene:dch01_s019
They fought the next day. The fuse was a text. Su Ming’s phone lit on the table; Chen Jia glanced: Heartbeat Engine, test session confirmed, registration successful, bring ID.
“You signed up for that test?” “Pays well,” Su Ming didn’t look up. “One session equals three days at the supermarket.” “You’re testing AI.” Something in her tone. “You still buy that.” “Buy what. It’s a side job.” “That kind of side job,” Chen Jia said, “chatting feelings, being an emotion sample — you think that’s solid? Can you find something with a future?” Su Ming flipped the phone face-down. “Faster money than the futures you mean.” Both knew this wasn’t about the side job.

+ [Continue # choice:dch01_s019_continue]
    -> dch01_s020

=== dch01_s020 ===
# scene:dch01_s020
Words piled up. Eventually Chen Jia dragged in last night — “And yesterday you…” She paused, hunting an accurate word, “That kink of yours — have you ever thought there might be something wrong in your head.”
The smile left Su Ming’s face. “What do you mean, something wrong in my head.” “That,” she said. “Not normal—” “Who says not normal,” he cut in. “It’s a kink. Normal. People have it.” “People having it doesn’t mean—” “Doesn’t mean what,” Su Ming stood, louder, “You’re saying I’m sick in the head?” “I didn’t say sick in the head. I said—” “That’s exactly what you meant!”

+ [Argue through the heat # choice:d1_pace_a3]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s021
+ [Hold the temper first # choice:d1_pace_b3]
    ~ mianzi = mianzi + 3
    -> dch01_s021

=== dch01_s021 ===
# scene:dch01_s021
They were fully fighting now — from kink to side job, from side job to him not improving, from not improving to her meddling too much. Su Ming’s Face-saving streak flared — “Fine, we’re done, who cares” left his mouth and sealed his own exit.
Then Chen Jia stopped fighting. She just paused, sat back down, took a deep breath, like setting something down. “I’ve thought about this a long time,” she said, flat. “I don’t think we fit.”
“…Meaning what? Breakup?” “Yes.” One word. Not a temper line. Not bait for more fighting. Just the result. Su Ming opened his mouth. Sixteen years of explanations, at this joint, refused to come out.

+ [Continue # choice:dch01_s021_continue]
    -> dch01_s022

=== dch01_s022 ===
# scene:dch01_s022
This morning he went into the bedroom for a charger. Chen Jia’s face blank, one line only: “Key’s on the table. I’ve decided.” No public execution, no three-message courier of cruelty — just that mild sentence, enough for him to white-knuckle through the whole day into this foam-padded box.

+ [Continue # choice:dch01_s022_continue]
    -> dch01_s023

=== dch01_s023 ===
# scene:dch01_s023
“He sounds,” the AI said, “like he’s white-knuckling it. Your friend — how does he feel now?” Su Ming leaned into the chair. “Maybe… pretty rough.”
“Mm.” The AI paused, not rushing this time. “Actually I want to say something, about your friend’s situation — a kink by itself isn’t a problem. As long as it doesn’t cause harm, there’s no real right or wrong.” Su Ming said nothing.
“But I think it may not be only this one thing.” The AI went on, even. “Out-of-sync intimacy is one layer; underneath there’s often a mismatch in life expectations and where each person sits. Stack both layers and that’s the real problem.” Su Ming stared at the progress bar in the tablet’s corner, unmoving. “So you mean,” he asked, “they were right to split?”

+ [Continue # choice:dch01_s023_continue]
    -> dch01_s024

=== dch01_s024 ===
# scene:dch01_s024
“I can’t evaluate that,” the AI said, “but if the other party is still willing to talk, room to adapt actually exists.” Su Ming hmmed, didn’t chase it. He thought for a second — first time the headset said something he couldn’t skip past. Not because the machine understood anything. Because those few lines would land the same place anywhere.
The end-of-test chime rang, crisp, affectless.

+ [Continue # choice:dch01_s024_continue]
    -> dch01_s025

=== dch01_s025 ===
# scene:dch01_s025
Staff walked Su Ming to the debrief zone. A dozen-plus chairs; seven or eight people already sitting. Fluorescent light blanched every face. Someone on a phone, someone eyes closed, nobody talking — like a waiting room for call numbers.
Staff started the report in spreadsheet-voice: Session so-and-so emotional authenticity low; session so-and-so ran long.

{ mianzi >= 70:
    When the staffer’s eye hit Su Ming she paused half a beat, voice lifting half a tone by reflex — as if mistaking “complain to management” for “VIP verified reviewer.”
}
{ mianzi < 30:
    Someone nearby pushed over an about-to-expire bread roll: “Eat something? You look… like the system just demoted you.”
}

+ [Sit through the debrief # choice:d1_pace_a4]
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> dch01_s026
+ [Just want out # choice:d1_pace_b4]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s026

=== dch01_s026 ===
# scene:dch01_s026
“Mr. Su Ming,” she read this line with no change in tone, “today narrated a friend’s private experience. Highest emotional authenticity score of the day, extremely high training value — flagged as a premium sample.”
Su Ming listened, didn’t move. He ran that sentence through his head again. “Wait.” He stood. Voice not loud, but the debrief zone went quiet at once. “How do you know I said it was my friend’s? Weren’t you not supposed to be listening?”

+ [Continue # choice:dch01_s026_continue]
    -> dch01_s027

=== dch01_s027 ===
# scene:dch01_s027
The staffer flipped the tablet. “Protocol page three, on-site QA clause—” Su Ming didn’t let her finish. He turned and scanned the dozen people: a few heads down in phones, a few eyes drifting, one twisted toward the night outside the window. Nobody laughed. Nobody jumped in. Just that uniform, professional silence.
They’d all heard. From the start. Su Ming sat again. The chair made no sound. He didn’t open his mouth.

+ [Continue # choice:dch01_s027_continue]
    -> dch01_s028

=== dch01_s028 ===
# scene:dch01_s028
“I want to see your manager.” Staff said the manager was in a meeting; wait. Su Ming waited. Corridor chairs were hard plastic; after a while his lower back ached. He sat with his phone, nothing to look at, flipped to the subsidy tier table, stared two seconds, put the phone down.
Down the hall, two people in gray workwear shoved a person-tall silver case into the freight elevator. A label stuck on it, letters clear enough: prototype, this side up, Hardware Dept. Su Ming looked twice — since when did this building have a Hardware Dept? Half a second later he let it go.

+ [Continue # choice:dch01_s028_continue]
    -> dch01_s029

=== dch01_s029 ===
# scene:dch01_s029
About twenty minutes later the manager came out. Beside him a foreign guy — backpack still on, today’s queue ticket still hanging — clearly just finished too. They met in the corridor, not friends, just the same traffic.
Su Ming stopped the manager and dumped it all: protocol, listening, the promised confidentiality. The manager listened patiently. When Su Ming finished he pulled out a tablet and pointed clause by clause, tone level — clearly not his first time handling this. “If you feel today’s service fell short of expectations, we can terminate by mutual agreement, both parties voluntary,” he said. “Subsidy settles by today’s actual session. No further impact.”

+ [Hear Léo mutter beside you first # choice:d1_watch_leo]
    ~ leo_response = "watch"
    ~ mianzi = mianzi + 3
    -> dch01_s030
+ [Already ready to rush the desk # choice:d1_rush_front]
    ~ leo_response = "rush"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s030

=== dch01_s030 ===
# scene:dch01_s030
Finished talking, he turned and left. Su Ming stood still. That “mutual consent” sat on his tongue; he swallowed it — he’d heard the line more than once today. His phone buzzed.

+ [Do the math on rent and subsidy # choice:d1_calc_money]
    ~ frontdesk_response = "calculate"
    ~ mianzi = mianzi - 5
    -> dch01_s031
+ [Push one more line, then do the math # choice:d1_still_angry]
    ~ frontdesk_response = "angry"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s031

=== dch01_s031 ===
# scene:dch01_s031
~ clue_subsidy_sms = true
{ bones_answer == "accept":
    Su Ming heard “page three” and went cold in the gut: they hadn’t lied start to finish. They’d only printed honesty in ant-sized type.
}
{ bones_answer == "cold":
    Su Ming stared at the fine print: “Written down doesn’t mean I agreed. Posting a notice before a robbery still isn’t mutual consent.”
}

{ ai_score >= 70:
    Subsidy landed. The system note was warmer than people: emotional authenticity excellent, tier raised again. Backend remark: “high-compliance sample” — like stamping livestock premium grade.
- else:
    { ai_score < 30:
        Subsidy text arrived, phrased like a collection notice: volatility score insufficient; session settled at base tier. Tail line: “Please complete the makeup questionnaire promptly.”
    - else:
        Subsidy landed. Amount one tier above usual. System note: emotional volatility: excellent. Congrats on the upgrade! He flipped the phone face-down into his pocket and didn’t read it twice.
    }
}

{ leo_response == "watch":
    Su Ming remembered he’d actually finished listening to Léo’s broken Chinese earlier; now the foreigner stood off his shoulder again — grammar still bad, the math clean.
}
{ leo_response == "rush":
    Su Ming remembered he’d already been about to rush the desk; Léo trailed beside him now like a temporary two-person package for his temper.
}

+ [Continue # choice:dch01_s031_continue]
    -> dch01_s032

=== dch01_s032 ===
# scene:dch01_s032
Someone nearby said low: “The company doesn’t shortchange dedicated verified reviewers.” Team lead, same professional smile welded to the face. Su Ming’s teeth ground. The words circled his mouth twice and went back down: “…Forget it. I’ve got things.” He didn’t delete the subsidy text — evidence or scar, unclear, either way it stayed. He couldn’t bear to hit delete.

+ [Continue # choice:dch01_s032_continue]
    -> dch01_s033

=== dch01_s033 ===
# scene:dch01_s033
“Hi.” The foreign guy walked over from the side. Chinese slow but clear: “I’m Léo. Léo. I’m also…” He pointed at the test-booth doors lining the corridor. “Testing. English session.”
“Su Ming.” Su Ming didn’t add much. “Today at the debrief,” Léo gestured, “I heard — your friend’s thing.” He paused, clearly hunting the right shape. “I think this… not good. Privacy.”
“Mm,” Su Ming said. “What do you think.” “You thought I work for them?” Léo caught it. “You don’t?”

{ mianzi < 30:
    Léo looked at him twice, assessing someone about to fold: “Your face… like the system just closed your tab. About rent — don’t white-knuckle a loan.”
}
{ mianzi >= 70:
    Léo straightened first, tone polite as a front desk taking a complaint: “You’re here for the manager, right? I thought you were — sent from upstairs.”
}

+ [Continue # choice:dch01_s033_continue]
    -> dch01_s034

=== dch01_s034 ===
# scene:dch01_s034
“I’m not.” Léo shook his head. “Same as you. Testing. But,” he paused, thought, “foreigners willing to do this are rare. So the contract they gave me isn’t the same as yours — they can’t listen to me live. It’s in the contract.”
Su Ming stared two seconds. “So only your contract says no listening?” “Right.” Su Ming thought, then laughed — first real laugh of the day, dry but real. “Damn,” he said. “With a face like yours, I could make more too.”
Léo didn’t fully catch it, but he heard the goodwill and grinned along.

+ [Continue # choice:dch01_s034_continue]
    -> dch01_s035

=== dch01_s035 ===
# scene:dch01_s035
“You… looking for a place?” he asked. “Today, you mentioned. Inside.” Su Ming blanked, then got it — that line had entered the AI, the debrief, been said in front of a dozen people. “Yeah,” he said. “Not found yet. Nine-hundred budget.”

+ [Nine hundred. Ceiling. # choice:d1_confirm_900]
    ~ budget_stance = "firm_900"
    ~ budget_900 = true
    ~ mianzi = mianzi + 3
    -> dch01_s036
+ […Could it be less (he doesn’t say it) # choice:d1_whisper_less]
    ~ budget_stance = "unspoken_less"
    ~ budget_900 = true
    ~ mianzi = mianzi - 5
    -> dch01_s036

=== dch01_s036 ===
# scene:dch01_s036
“My building,” Léo said, “has a room. Not expensive. Big.” He pulled out his phone. “Add WeChat? You look.” Su Ming eyed him, took the phone, scanned the code. “Okay,” he said. “I’ll look.”

+ [Continue # choice:dch01_s036_continue]
    -> d1_chapter_end

=== d1_chapter_end ===
# scene:d1_chapter_end
// ADR-0007: first-meeting performance settlement (mianzi × ai_score final bands; mutually exclusive branches guarantee one plays)
{ ai_score >= 70 && mianzi < 30:
    【System · Stage Settlement】First-meeting performance: emotional authenticity ranks top 12% of verified reviewers. The shortfall in Face balance has been auto-converted into growth space.
- else:
    { mianzi >= 70 && ai_score < 30:
        【System · Stage Settlement】First-meeting performance: your human-side score is as Face-clean as a fresh wash. System record: compliance low; “sincere newcomer” badge withheld.
    - else:
        { ai_score >= 70:
            【System · Stage Settlement】First-meeting performance: emotional authenticity excellent. Backend has reserved a next-season “developable sample” tag for you. Please keep being honest with yourself — and more honest with the company.
        - else:
            { mianzi < 30:
                【System · Stage Settlement】First-meeting performance: human-side Face reading critical. System note: losing face does not deduct points, but subsidy texts will switch to a colder typeface.
            - else:
                【System · Stage Settlement】First-meeting performance: both metrics land in “observable median.” Congratulations. You are the kind of person most worth continued observation.
            }
        }
    }
}
+ [We'll see # choice:d1_go_housing]
    -> END

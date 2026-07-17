// 第一章 你有病吧 — densified from supa-luv-v2 ch01 (2026-07-16).
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
“聊天记录测完就删，一个字不留。您说得越真，情绪波动分越高，补贴档位也高，懂吧？”
工作人员这句话说出口的时候，手指正点在协议签字页上，笑得跟卖保险的一样职业，那种笑法练了不知道多少年，嘴角弧度都是标准的。苏明这才有空打量起这间屋子——四面钉着蜂窝状的隔音棉，天花板正中央嵌着一个鱼眼摄像头，镜头边缘那颗红点常年亮着，不闪，也不熄。桌上摆着一块平板，靠背椅是网吧同款，只不过换了个说法，叫“沉浸座椅”——听着高级，坐进去才知道弹簧一样会硌人。这里只差把难堪按斤称。

+ [继续 # choice:dch01_s001_continue]
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
校准台载入虚构样本 1/3。
+ [平静 # choice:emotion_calibration_q1_calm]
    ~ emotion_calibration_q1 = "calm"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [刺痛 # choice:emotion_calibration_q1_sting]
    ~ emotion_calibration_q1 = "sting"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [爆表 # choice:emotion_calibration_q1_overload]
    ~ emotion_calibration_q1 = "overload"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> q2
+ [跳过校准 # choice:emotion_calibration_q1_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> skipped

= q2
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:2
校准台载入虚构样本 2/3。
+ [平静 # choice:emotion_calibration_q2_calm]
    ~ emotion_calibration_q2 = "calm"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q3
+ [刺痛 # choice:emotion_calibration_q2_sting]
    ~ emotion_calibration_q2 = "sting"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q3
+ [爆表 # choice:emotion_calibration_q2_overload]
    ~ emotion_calibration_q2 = "overload"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> q3
+ [跳过校准 # choice:emotion_calibration_q2_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> skipped

= q3
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:3
校准台载入虚构样本 3/3。
+ [平静 # choice:emotion_calibration_q3_calm]
    ~ emotion_calibration_q3 = "calm"
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> result
+ [刺痛 # choice:emotion_calibration_q3_sting]
    ~ emotion_calibration_q3 = "sting"
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> result
+ [爆表 # choice:emotion_calibration_q3_overload]
    ~ emotion_calibration_q3 = "overload"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> result
+ [跳过校准 # choice:emotion_calibration_q3_skip]
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
    系统把未完成项标成“人工判断保留”工作人员扫了一眼：“不想替机器猜也行，主测照常。”
- else:
    { emotion_calibration_correct_count == 3:
        三格指示灯同时转绿。工作人员挑了下眉：“准得像干过客服。别得意，机器正学你。”
    - else:
        { emotion_calibration_correct_count == 2:
            两格亮绿，一格保持灰色。工作人员点点头：“够用。剩下一格让模型自己挨骂长记性。”
        - else:
            屏幕把结果记成“个人阈值偏差”工作人员耸耸肩：“这不是考试，你和机器只是不疼在一个地方。”
        }
    }
}

+ [继续 # choice:emotion_calibration_continue]
    -> dch01_s002

=== dch01_s002 ===
# scene:dch01_s002
协议贴在门后头，字号小得跟藏起来似的：本产品情感真实度依赖用户真情流露，测试期间数据用于模型迭代，测试结束后原始录音自动清除。“清除”两个字加了粗。
“删干净？”苏明没接那茬，反倒摸出手机，翻出一张截图怼了过去，“上回仓库那批货，标签也印着‘绝对准时’四个大字。我照样迟到三次，工资一分没少打。你这个‘绝对’，是哪一种？”

+ [继续 # choice:dch01_s002_continue]
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
条款校对 1/3 · 原始录音自动清除。
+ [字面接受：清除就是清除 # choice:protocol_test_q1_literal]
    ~ protocol_test_q1 = "literal"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> q2
+ [标记隐患：字面没了骨头留着 # choice:protocol_test_q1_model]
    ~ protocol_test_q1 = "model"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> q2
+ [跳过条款 # choice:protocol_test_q1_skip]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> skipped

= q2
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:2
条款校对 2/3 · 测试期间数据用于模型迭代。
+ [字面接受：迭代听起来正常 # choice:protocol_test_q2_literal]
    ~ protocol_test_q2 = "literal"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> q3
+ [标记隐患：今天的故事会喂下一批 # choice:protocol_test_q2_model]
    ~ protocol_test_q2 = "model"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> q3
+ [跳过条款 # choice:protocol_test_q2_skip]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> skipped

= q3
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:3
条款校对 3/3 · 情感真实度依赖用户真情流露。
+ [字面接受：真情流露就行 # choice:protocol_test_q3_literal]
    ~ protocol_test_q3 = "literal"
    ~ protocol_test_completed_at_version = "protocol-test-v1"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> result
+ [标记隐患：真情也是训练素材 # choice:protocol_test_q3_model]
    ~ protocol_test_q3 = "model"
    ~ protocol_test_completed_at_version = "protocol-test-v1"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> result
+ [跳过条款 # choice:protocol_test_q3_skip]
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
    平板把未读条款折成“人工略过”工作人员耸肩：“不抠字也行，骨头那句等会儿再说。”
- else:
    平板把三张条款卡收进日志。苏明拇指还停在“清除”两个粗体字上，像按住一只会逃跑的词。
}

+ [继续 # choice:protocol_test_continue]
    -> dch01_s003

=== dch01_s003 ===
# scene:dch01_s003
工作人员愣了半秒，随即笑意深了一层，像是遇上了识货的：“您这是懂行的。”她也不绕弯子，“这么说吧——录音字面上是真删。可您今天讲的这段，会被拿去喂给下一批模型，教它以后怎么接话。字面没了，骨头留着。”
苏明信的从来不是“绝对删干净”，是“骨头留着”——后门至少当面指给他看。这些年他练出一条经验：凡写着“绝对”的，十有八九留了后门。

+ [点头：至少说人话了 # choice:d1_bones_accept]
    ~ bones_answer = "accept"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score + 3
    -> dch01_s004
+ [冷笑：后门也算诚实 # choice:d1_bones_cold]
    ~ bones_answer = "cold"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s004

=== dch01_s004 ===
# scene:dch01_s004
门关上，隔音棉把外头的声音都吸走了，耳机里响起一个女声，声音甜得刚刚好，不腻，客服跟情人那味道各苏明做了个深呼吸。

+ [继续 # choice:dch01_s004_continue]
    -> dch01_s005

=== dch01_s005 ===
# scene:dch01_s005
这也不是他头一回测。上个月他编过“职场受气”，系统给了“情绪波动：优”规律他早摸清：情绪要有起伏，细节要够具体，开场不能太顺。这回他想先铺一段感情好的，落差才够卖。
“挺好的，”他往椅背上一靠，语气做出回忆的从容，“上周末带我女朋友出去吃饭，她喜欢往菜里加辣，点的那道水煮牛肉，辣到我眼泪都出来了，她还笑我不行。那天挺好玩的。”

+ [继续 # choice:dch01_s005_continue]
    -> dch01_s006

=== dch01_s006 ===
# scene:dch01_s006
耳机那头没有接心疼的话。沉默持续了大概三秒，比预计的长一点。

+ [继续 # choice:dch01_s006_continue]
    -> dch01_s007

=== dch01_s007 ===
# scene:dch01_s007
“根据您上次的记录，”AI 说，语气还是那副甜的，但多了一种叫人说不清哪里不对劲的平稳，“您曾表苏明的手指停了一下。“你搞错了吧。”
苏明的手指停了一下。
“你搞错了吧。”

+ [先把矛盾听完 # choice:d1_pace_a1]
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    【系统】情感真实度 +5。您已完整接收矛盾样本。矛盾是数据的朋友，请继续。
    -> dch01_s008
+ [想提前结束 # choice:d1_pace_b1]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s008

=== dch01_s008 ===
# scene:dch01_s008
“您今天的情绪指标存在矛盾。”AI 停了一拍，像是在调取什么档案，随即继续，“系统将标记本次场次苏明坐直了些，语气不自觉地换了一个调：“提前结束，扣钱吗？”“是的。”
“是的。”

+ [继续 # choice:dch01_s008_continue]
    -> dch01_s009

=== dch01_s009 ===
# scene:dch01_s009
短促，不含糊，跟敲了颗钉子一样。苏明的手在膝盖上按了按。他心里过了一遍账，算得很快，这个习惯跟了他好多年了，不用过脑子，数字自己“请放心，”AI 的声音重新变得温柔，带了点专门设计过的体贴，“本测试间全程保密，您的对话不会被隔壁质检室的门虚掩着一条缝。

+ [继续 # choice:dch01_s009_continue]
    -> dch01_s010

=== dch01_s010 ===
# scene:dch01_s010
薯片没拆。戴降噪耳罩的姑娘跟同事对了个眼神，小声：“这 AI 还挺会套的。”同事点头，声音更低：“今晚好几条都是这么出来的。”
测试间里，苏明往椅背上靠，耳机里那句“全程保密”还在空气里转悠。他嘴角动了一下，动作里有什么东西松开了一点——不多，就那么一点点。
两个人放下打标签的笔，都在听。

+ [继续 # choice:dch01_s010_continue]
    -> dch01_s011

=== dch01_s011 ===
# scene:dch01_s011
招募说明写得客气：情感表达能力强、深度参与产品迭代、人体样本、按场次结算。翻译成大白话就一句：你痛得越真，公司挣得越多。借一个“朋友”的壳，至少能跟自己说——这只是转述，不是认账。

+ [借朋友的壳：他昨天分手了 # choice:d1_tell_flat]
    ~ breakup_delivery = "flat"
    ~ told_breakup_flat = true
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch01_s012
+ [更硬一点：真实的你们要吗 # choice:d1_tell_hard]
    ~ breakup_delivery = "hard"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    ~ told_breakup_flat = false
    【系统】情感真实度 +5。原始亲密素材接收成功。请勿担心：我们只训练模型，不训练良心。
    -> dch01_s012


=== dch01_s012 ===
# scene:dch01_s012
“……行，我说。”他开口，语气比刚才随意了一些，像是随便聊聊的口吻，“但这是我一个朋友的事——他昨天分手了。”
{ breakup_delivery == "flat":
    “……行，我说。”他开口，语气比刚才随意了一些，像是随便聊聊的口吻，“但这是我一个朋友的事——他昨天分手了。”
}
{ breakup_delivery == "hard":
    “……行，我说。”嗓子发紧，“你们要真实？那我也不装了——我昨天分手了。”
}
“请继续。”
走廊椅子上坐着个外国小伙，二十出头，书包还没卸下来，手里攥着张英文场次的排号条，捏得都有点皱了。他叫雷欧，来重庆读语言班，生活费靠给“心动引擎”测出海版。测试间里，苏明还在往下说。

+ [继续 # choice:dch01_s012_continue]
    -> dch01_s013


=== dch01_s013 ===
# scene:dch01_s013
“不是那种早就没话讲的分手。”他说，声音低了一些，“我那个朋友，昨天晚上还好好的。”

+ [继续 # choice:dch01_s013_continue]
    -> dch01_s014

=== dch01_s014 ===
# scene:dch01_s014
昨晚吃完饭，陈佳先抢到最后一块排骨，拿筷子夹起来举着，像赢了什么。酱汁蹭到她嘴角，苏明伸筷子想帮这种时候没什么话说，说什么都行。陈佳靠在他肩上刷手机，他低头看了一眼她屏幕，“你又在看那个博主”，她懒懒嗯了一声没解释，往他肩上这两年这种时候不多，但也不是没有。

+ [把那顿饭记得清楚点 # choice:d1_pace_a2]
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    【系统】情感真实度 +5。晚餐细节已入库。温馨提示：回忆越清楚，补贴表越好看。
    -> dch01_s015
+ [快进到出事的地方 # choice:d1_pace_b2]
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch01_s015

=== dch01_s015 ===
# scene:dch01_s015
两个人就着这点收尾的温度往里走。灯没关，也没人去关——那会儿气氛热，谁都不想打断，谁都乐意往下走这种时候苏明脑子里通常有个开关，他心里管它叫“正常人”，摁一下能管大半天——十二岁那年他第一次发昨晚这个开关，偏偏没摁住。

+ [继续 # choice:dch01_s015_continue]
    -> dch01_s016

=== dch01_s016 ===
# scene:dch01_s016
进行到一半，他低下头。他自己也说不清楚是怎么回事，视线落到陈佳的脚，然后嘴就跟了上去，等他意识到的时候，嘴里含着的已经陈佳感觉到了。她先是整个人定住，动作停了，呼吸也停了一拍，然后，非常慢地，转过来看他。两个人对视。灯还亮着，房间里没有别的声音。苏明能清楚看见陈佳脸上那个表情——不是愤怒，是那种纯粹的、完全来不谁都没先说话。
进行到一半，他低下头。
两个人对视。
谁都没先说话。

+ [继续 # choice:dch01_s016_continue]
    -> dch01_s017

=== dch01_s017 ===
# scene:dch01_s017
“……你干嘛呢。”她说话了，声音是那种很轻、很慢的调子，好像怕问急了对方反而解释不清楚，像老师问学生“你刚才在干嘛苏明刚松开嘴。“哦，”他说，“我也不知道。”停顿。“本能？”沉默。
“……你干嘛呢。”
苏明刚松开嘴。
停顿。
“本能？”
沉默。

+ [（回想时）把脸埋进掌心 # choice:d1_memory_shame]
    ~ memory_posture = "shame"
    ~ mianzi = mianzi - 8
    ~ ai_score = ai_score + 5
    【系统】情感真实度 +5。遮脸动作已被标记为「高纯度羞赧」。该数据已同步至企业后台。祝您今天也保持真诚。
    -> dch01_s018
+ [（回想时）咬牙把后文讲完 # choice:d1_memory_hard]
    ~ memory_posture = "hard"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> dch01_s018

=== dch01_s018 ===
# scene:dch01_s018
“把我脚放开。”苏明松了手。“不是吧——你生气了？”陈佳没回答。她把脚缓缓收回去，拽了被子压在腿上，眼神回到天花板。“算了。今天算了。”
当晚就这么收了。门关上，反锁的声音清清楚楚——甩门是气话，锁门是想清楚了的决定。苏明躺沙发，手机亮了又灭七八遍，一条消息也没编出来。
“把我脚放开。”
“算了。”她说。“今天算了。”
不是想好了不说，是什么都还没想好，话梗在喉咙里，每一句都是错的，一句也出不来。

+ [继续 # choice:dch01_s018_continue]
    -> dch01_s019

=== dch01_s019 ===
# scene:dch01_s019
隔天吵起来，导火索是一条手机短信。桌上苏明的手机屏幕点亮了，陈佳扫了一眼：心动引擎，测试场次确认，报名成功，请携本人证件。“你报了那个测试？”“钱不错，”苏明没抬头，“一场顶超市干三天。”“你去测AI。”她语气里有点什么，“你还信那个。”“信什么，是兼职。”“那种兼职，”陈佳说，“跟人聊感情，做情感样本，你觉得靠谱？你能不能找个有前景一点的？”苏明把手机翻面，“比你说的有前景的来钱快。”两个人都知道这不是在聊兼职。
“你报了那个测试？”
“信什么，是兼职。”

+ [继续 # choice:dch01_s019_continue]
    -> dch01_s020

=== dch01_s020 ===
# scene:dch01_s020
话越说越多，说着说着陈佳带出了昨晚——“而且你昨天那个……”她顿了一下，像是在找个准确的词，“你苏明脸上的笑收掉了。“怎么叫心里有什么。”“就是那个，”她说，“不正常——”“谁说不正常，”他打断，“这叫性癖，正常的，有人这样的。”“有人这样不代表——”“不代表什么，”苏明站起来，声音大了，“你说我心里有病？”“我没说心里有病，我说的是——”
苏明脸上的笑收掉了。
“有人这样不代表——”

+ [硬着头皮辩 # choice:d1_pace_a3]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s021
+ [先把火气压住 # choice:d1_pace_b3]
    ~ mianzi = mianzi + 3
    -> dch01_s021

=== dch01_s021 ===
# scene:dch01_s021
从性癖吵到兼职，从兼职吵到他不上进，从不上进吵到她管太宽。苏明死要面子的劲儿冒头，“分就分，谁稀罕”脱口而出，把退路自己堵了个干净。
然后陈佳不吵了。她只是停下来，坐回去，深呼一口气，像是把什么东西放下了。“我想了很久了，”她说，声音是平的，“我觉得我们不合适。”
“……啥意思？要分手？”“对。”一个字。不是气话，也不是要他接着吵，就是结果。苏明张了张嘴，十六年攒下来的解释，真到了这个节骨眼上，愣是一句都掏不出来。
“你说的就是这个意思！”
然后陈佳不吵了。
苏明：“……啥意思？要分手？”
“对。”

+ [继续 # choice:dch01_s021_continue]
    -> dch01_s022

=== dch01_s022 ===
# scene:dch01_s022
今早他进卧室拿充电器，陈佳脸上没什么表情，只丢下一句：“钥匙放桌上，我想清楚了。”没有当众处刑，也没有闪送三连虐——就这么淡淡一句，反倒够他硬撑一整天，硬撑到了这间四面钉着隔音棉的小屋子里。

+ [继续 # choice:dch01_s022_continue]
    -> dch01_s023

=== dch01_s023 ===
# scene:dch01_s023
“他听起来，”AI 说，“在硬撑。你朋友，现在感觉怎么样？”苏明往椅背上靠了靠。“可能……挺难受的吧。”“嗯。”AI 停了一下，这次没有急着接话，像是在想怎么说，“其实我想说一件事，关于你朋友那个情况苏明没说话。“但我觉得他们的事可能不只是这一件。”AI 继续，语气不温不火的，像是在认真解释，“亲密上不同频苏明盯着平板角落的进度条，没动。“那你的意思是，”他问，“他们分对了？”

+ [继续 # choice:dch01_s023_continue]
    -> dch01_s024

=== dch01_s024 ===
# scene:dch01_s024
“我没法这样评价，”AI 说，“但如果对方还愿意沟通，磨合的空间其实是有的。”苏明嗯了一声，没再追。他心里想了一下——这倒是头一次，耳机里出来的话让他没法直接跳过去。不是因为机器听懂了什么，是那几测试结束的提示音响了，清脆，不含感情。

+ [继续 # choice:dch01_s024_continue]
    -> dch01_s025

=== dch01_s025 ===
# scene:dch01_s025
工作人员把苏明带到小结区。十几把椅子，七八个人已经坐着，荧光灯把大家的脸照得白了一圈。有人低头玩手机，有人闭眼，谁都不说话，像在候诊室等叫号。
工作人员开始汇报，语气跟念报表一样平：某某场次情绪真实度偏低，某某场次时长超出预期。

{ mianzi >= 70:
    工作人员扫到苏明时停了一拍，声音下意识抬高半度，像把“投诉领导”错认成了“贵宾体验官”。
}
{ mianzi < 30:
    旁边有人把临期小面包推过来：“吃点？你看起来……像刚被系统降档。”
}

+ [听完小结 # choice:d1_pace_a4]
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> dch01_s026
+ [只想快点走 # choice:d1_pace_b4]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s026

=== dch01_s026 ===
# scene:dch01_s026
“苏明先生，”她念到这一条，语气没什么变化，“今天讲述了一位朋友的私密经历，情绪真实度评分最高，苏明听完，没动。他又把那句话在脑子里过了一遍。“等一下。”他站起来，声音不算大，但小结区里登时安静了，“你怎么知道我说的是我朋友的事？你们不是已标记为优质样本。

+ [继续 # choice:dch01_s026_continue]
    -> dch01_s027

=== dch01_s027 ===
# scene:dch01_s027
工作人员把平板翻了一下，“协议第三页，现场质检条款——”苏明没听她念完。他转头扫了一圈周围那十几个人：几个低下头盯着手机，几个眼神飘开，有一个扭向窗外去他们都听见了。从一开始就听见了。苏明重新坐下去，椅子没发出声音，他没再开口。

+ [继续 # choice:dch01_s027_continue]
    -> dch01_s028

=== dch01_s028 ===
# scene:dch01_s028
“我要见你们负责人。”工作人员说负责人在开会，让他等。苏明等。走廊的椅子是那种硬塑料的，坐久了腰酸。他坐着看手机，没什么可看的，翻来翻去翻到补贴档位表，盯了两走廊另一头，两个穿灰色工装的人正推着一只一人高的银色箱子往货运电梯里挪，箱子上贴着一张标签，字挺标签写着：样机，勿倒置，硬件部。

+ [继续 # choice:dch01_s028_continue]
    -> dch01_s029

=== dch01_s029 ===
# scene:dch01_s029
等了大概二十分钟，负责人出来了。身边站着个外国小伙——书包还背着，身上还挂着今天的场次排号条，显然也刚测完。两个人在走廊碰头，不像熟识，就是顺路碰上了。
苏明拦住负责人，把话说了：协议、监听、说好的保密。负责人听得很耐心，等他说完，把平板拿出来，把条款一条一条指给他看，语气平稳——这种事他显然不是头一回处理。

+ [先听雷欧在旁边嘀咕完 # choice:d1_watch_leo]
    ~ leo_response = "watch"
    ~ mianzi = mianzi + 3
    -> dch01_s030
+ [已经想冲上去谈 # choice:d1_rush_front]
    ~ leo_response = "rush"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s030

=== dch01_s030 ===
# scene:dch01_s030
说完，他转身走了。苏明站在原地。那个“双方自愿”落在他嘴边，他把它吞回去了——那话今天已经听了不止一遍。手机这时震了一下。
说完，他转身走了。
手机这时震了一下。

+ [在心里算房租和补贴 # choice:d1_calc_money]
    ~ frontdesk_response = "calculate"
    ~ mianzi = mianzi - 5
    -> dch01_s031
+ [再顶一句，再算账 # choice:d1_still_angry]
    ~ frontdesk_response = "angry"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch01_s031

=== dch01_s031 ===
# scene:dch01_s031
~ clue_subsidy_sms = true
{ bones_answer == "accept":
    苏明听见“第三页”，胃里发凉：他们倒是从头到尾没撒谎，只把诚实印成了蚂蚁。
}
{ bones_answer == "cold":
    苏明盯着那行小字：“写明了不等于我同意。抢劫前贴告示，也不叫双方自愿。”
}

{ ai_score >= 70:
    补贴到账。系统附言比人还热情：情感真实度优，档位再升一级。后台备注写着「高配合样本」，像给猪打了优等章。
- else:
    { ai_score < 30:
        补贴短信来了，措辞却像催办：波动分不足，本场按基础档结算。末尾还有一句「请尽快完成补测问卷」。
    - else:
        补贴到账。金额比平时高了一档，系统附言：情绪波动：优。恭喜升档！他把手机翻面，放进口袋，没看第二遍。
    }
}

{ leo_response == "watch":
    苏明记得自己先前真把雷欧那句夹生中文听完了；现在这老外又站在侧后，语法还是烂，账倒算得清。
}
{ leo_response == "rush":
    苏明记得自己先前已经要冲上去谈；雷欧这会儿跟在旁边，像给他的火气临时办了个双人套餐。
}

+ [继续 # choice:dch01_s031_continue]
    -> dch01_s032

=== dch01_s032 ===
# scene:dch01_s032
旁边有人低低地说了一句：“公司不亏待用心的体验官。”是小组长，还是那副职业笑，像脸上焊死了这个表情。苏明牙咬得咯咯响，话到嘴边绕了两圈，还是咽了回去：“……算了，我还有事。”那条补贴短信他没删掉——说不清是留个证据，还是留个疤，反正就那么留着，没舍得点删除。“你好。”
“你好。”

+ [继续 # choice:dch01_s032_continue]
    -> dch01_s033

=== dch01_s033 ===
# scene:dch01_s033
那个外国小伙从旁边走过来，中文说得很慢，但字很清晰，“我叫雷欧，Léo。我也是……”他指了指走廊“苏明。”苏明没多说。“我今天在小结的地方，”雷欧比画了一下，“听见了——你朋友那个事。”他顿了顿，显然在想怎么把意思“嗯，”苏明说，“你觉得呢。”“你以为我是他们公司的人？”雷欧看出来了。“不是？”
“苏明。”苏明没多说。
“不是？”

{ mianzi < 30:
    雷欧多看了他两眼，像在评估一个快撑不住的人：“你脸色……像刚被系统结账。房租的事，你先别硬撑着借。”
}
{ mianzi >= 70:
    雷欧反而先挺直了背，语气礼貌得像前台接投诉：“你是来找负责人的吧？我还以为你是——上面派来的。”
}

+ [继续 # choice:dch01_s033_continue]
    -> dch01_s034

=== dch01_s034 ===
# scene:dch01_s034
“不是。”雷欧摇头，“我跟你一样，测试的。但是，”他停了一下，想了想，“愿意干这个的外国人，很少苏明盯着他看了两秒。“就你合同里写了不能监听？”“对。”苏明想了一下，然后笑了，那是今天第一次真的笑，有点干，但是真的，“妈的。”他说，“长你这张脸，我雷欧没完全听懂，但他听出那是句好话，也跟着咧嘴笑了一下。

+ [继续 # choice:dch01_s034_continue]
    -> dch01_s035

=== dch01_s035 ===
# scene:dch01_s035
“你……找房子？”他问，“今天，你提到了。在里面讲的那个。”苏明愣了一下，然后反应过来——那条也进了AI，进了小结汇报，在那十几个人面前说了个遍。“对，”他说，“还没找到。九百的预算。”

+ [九百，顶天了 # choice:d1_confirm_900]
    ~ budget_stance = "firm_900"
    ~ budget_900 = true
    ~ mianzi = mianzi + 3
    -> dch01_s036
+ [……能不能再少点（他没敢说出口） # choice:d1_whisper_less]
    ~ budget_stance = "unspoken_less"
    ~ budget_900 = true
    ~ mianzi = mianzi - 5
    -> dch01_s036

=== dch01_s036 ===
# scene:dch01_s036
“我那个楼，”雷欧说，“有一间。不贵，大的。”他掏出手机，“加微信？你看看。”苏明看了他一眼，接过手机，扫了码。“好，”他说，“看看。”
“好，”他说，“看看。”

+ [继续 # choice:dch01_s036_continue]
    -> d1_chapter_end

=== d1_chapter_end ===
# scene:d1_chapter_end
导航把他们领进那条弯弯曲曲的旧巷。石家小楼还在更里头，灯是黄的，从窗缝里漏出来。
+ [进巷子 # choice:d1_go_housing]
    -> END

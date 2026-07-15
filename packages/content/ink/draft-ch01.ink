// 第一章 你有病吧 — densified from draft01.md; Ink is sole topology SSOT.
// Adult black comedy; no pornographic detail. Noncanonical draft.
VAR dignity = 50
VAR impulse = 50
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
第一章 你有病吧
"聊天记录测完就删，一个字不留。您说得越真，情绪波动分越高，补贴档位也高，懂吧？"

工作人员说这话时，手指正压着协议签字页，笑得像卖保险。苏明扫了一圈：蜂窝隔音棉、鱼眼摄像头、永不熄的红点；桌上摆着平板，网吧椅换了个名字叫“沉浸座椅”，弹簧照旧硌人。这里只差把难堪按斤称。

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
    -> q2
+ [刺痛 # choice:emotion_calibration_q1_sting]
    ~ emotion_calibration_q1 = "sting"
    -> q2
+ [爆表 # choice:emotion_calibration_q1_overload]
    ~ emotion_calibration_q1 = "overload"
    -> q2
+ [跳过校准 # choice:emotion_calibration_q1_skip]
    -> skipped

= q2
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:2
校准台载入虚构样本 2/3。
+ [平静 # choice:emotion_calibration_q2_calm]
    ~ emotion_calibration_q2 = "calm"
    -> q3
+ [刺痛 # choice:emotion_calibration_q2_sting]
    ~ emotion_calibration_q2 = "sting"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    -> q3
+ [爆表 # choice:emotion_calibration_q2_overload]
    ~ emotion_calibration_q2 = "overload"
    -> q3
+ [跳过校准 # choice:emotion_calibration_q2_skip]
    -> skipped

= q3
# scene:dch01_emotion_calibration
# interaction:emotion-calibration-v1
# interaction-step:3
校准台载入虚构样本 3/3。
+ [平静 # choice:emotion_calibration_q3_calm]
    ~ emotion_calibration_q3 = "calm"
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    -> result
+ [刺痛 # choice:emotion_calibration_q3_sting]
    ~ emotion_calibration_q3 = "sting"
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    -> result
+ [爆表 # choice:emotion_calibration_q3_overload]
    ~ emotion_calibration_q3 = "overload"
    ~ emotion_calibration_correct_count = emotion_calibration_correct_count + 1
    ~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
    -> result
+ [跳过校准 # choice:emotion_calibration_q3_skip]
    -> skipped

= skipped
~ emotion_calibration_skipped = true
~ emotion_calibration_completed_at_version = "emotion-calibration-v1"
-> result

= result
# scene:dch01_emotion_calibration
{ emotion_calibration_skipped:
    系统把未完成项标成“人工判断保留”。工作人员扫了一眼：“不想替机器猜也行，主测照常。”
- else:
    { emotion_calibration_correct_count == 3:
        三格指示灯同时转绿。工作人员挑了下眉：“准得像干过客服。别得意，机器正学你。”
    - else:
        { emotion_calibration_correct_count == 2:
            两格亮绿，一格保持灰色。工作人员点点头：“够用。剩下一格让模型自己挨骂长记性。”
        - else:
            屏幕把结果记成“个人阈值偏差”。工作人员耸耸肩：“这不是考试，你和机器只是不疼在一个地方。”
        }
    }
}

+ [继续 # choice:emotion_calibration_continue]
    -> dch01_s002

=== dch01_s002 ===
# scene:dch01_s002
协议贴在门后头，字号小得跟藏起来似的，得凑近了眯着眼才看得清：本产品情感真实度依赖用户真情流露，测试期间数据用于模型迭代，测试结束后原始录音自动清除。"清除"两个字加了粗。

"删干净？"苏明没接那茬，反倒摸出手机，翻出一张截图怼了过去，"上回仓库那批货，标签也印着'绝对准时'四个大字。我照样迟到三次，工资一分没少打。你这个'绝对'，是哪一种？"

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
    -> q2
+ [标记隐患：字面没了骨头留着 # choice:protocol_test_q1_model]
    ~ protocol_test_q1 = "model"
    -> q2
+ [跳过条款 # choice:protocol_test_q1_skip]
    -> skipped

= q2
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:2
条款校对 2/3 · 测试期间数据用于模型迭代。
+ [字面接受：迭代听起来正常 # choice:protocol_test_q2_literal]
    ~ protocol_test_q2 = "literal"
    -> q3
+ [标记隐患：今天的故事会喂下一批 # choice:protocol_test_q2_model]
    ~ protocol_test_q2 = "model"
    -> q3
+ [跳过条款 # choice:protocol_test_q2_skip]
    -> skipped

= q3
# scene:dch01_protocol_test
# interaction:protocol-test-v1
# interaction-step:3
条款校对 3/3 · 情感真实度依赖用户真情流露。
+ [字面接受：真情流露就行 # choice:protocol_test_q3_literal]
    ~ protocol_test_q3 = "literal"
    ~ protocol_test_completed_at_version = "protocol-test-v1"
    -> result
+ [标记隐患：真情也是训练素材 # choice:protocol_test_q3_model]
    ~ protocol_test_q3 = "model"
    ~ protocol_test_completed_at_version = "protocol-test-v1"
    -> result
+ [跳过条款 # choice:protocol_test_q3_skip]
    -> skipped

= skipped
~ protocol_test_skipped = true
~ protocol_test_completed_at_version = "protocol-test-v1"
-> result

= result
# scene:dch01_protocol_test
{ protocol_test_skipped:
    平板把未读条款折成“人工略过”。工作人员耸肩：“不抠字也行，骨头那句等会儿再说。”
- else:
    平板把三张条款卡收进日志。苏明拇指还停在“清除”两个粗体字上，像按住一只会逃跑的词。
}

+ [继续 # choice:protocol_test_continue]
    -> dch01_s003

=== dch01_s003 ===
# scene:dch01_s003
工作人员愣了半秒，随即笑意深了一层，像是遇上了识货的："您这是懂行的。"她也不绕弯子，"这么说吧——录音字面上是真删。可您今天讲的这段，会被拿去喂给下一批模型，教它以后怎么接话。字面没了，骨头留着。"

+ [点头：至少说人话了 # choice:d1_bones_accept]
    ~ dignity = dignity + 2
    -> dch01_s004
+ [冷笑：后门也算诚实 # choice:d1_bones_cold]
    ~ impulse = impulse + 3
    -> dch01_s004

=== dch01_s004 ===
# scene:dch01_s004
苏明信的从来不是“绝对删干净”，是“骨头留着”——后门至少当面指给他看。

门一关，隔音棉吞掉外头的声音。耳机里响起一个女声，甜得克制，客服和情人各掺一半："你好呀，今天过得怎么样？"

+ [继续 # choice:dch01_s004_continue]
    -> dch01_s005

=== dch01_s005 ===
# scene:dch01_s005
苏明往椅背上一靠，语气跟报快递单号差不多，平平的："分手了。昨天。"

耳机那头顿了顿，那停顿掐得极准，心疼来得恰到好处："愿意跟我说说吗？我不会评判你。"

+ [平平地说：分手了。昨天。 # choice:d1_tell_flat]
    ~ told_breakup_flat = true
    -> dch01_s006
+ [更硬一点：真实的你们要吗 # choice:d1_tell_hard]
    ~ dignity = dignity + 2
    ~ told_breakup_flat = false
    -> dch01_s006

=== dch01_s006 ===
# scene:dch01_s006
"评判不评判的，"苏明盯着平板角落那几条进度条——情绪波动、挽留意愿、真实倾诉，三条一个都没满，跟没吃饱似的耷拉在那儿，"你们这不是要真实吗？那我说真实的。"

招募说明把这活写得很体面：情感表达、深度参与、人体样本、按场结算。实际只有一条：你痛得越真，公司挣得越多。一场顶超市三天；脸皮第一次就交过学费。

+ [继续 # choice:dch01_s006_continue]
    -> dch01_s007

=== dch01_s007 ===
# scene:dch01_s007
上个月他编过一场“被甲方骂哭”，讲得眉飞色舞，系统给了“情绪波动：优”。假故事里他是演员；轮到真事，补贴每涨一档，遮羞布就少一块。

他讲的时候，隔壁质检室的门虚掩着一条缝。

~ clue_subsidy_sms = true
+ [继续 # choice:dch01_s007_continue]
    -> dch01_s008

=== dch01_s008 ===
# scene:dch01_s008
耳机线绕在支架上晃悠，一个戴降噪耳罩的姑娘正拆开一包薯片，嚼得又轻又碎，像是生怕自己嚼东西的动静会打断了正在上演的这出戏。这活儿她干了小半年了，说白了就是给测试内容打标签——真实、敷衍、表演型痛苦，三选一，一天能打上几十条，听得多了，她自己都总结出了一套门道：凡是开口第一句话就讲分手的，八成是真事；凡是先叹上三口气再慢慢讲的，八成是在演，演给系统看，也演给自己看。

"这男的一上来就分手，"她压低声音跟旁边同事嘀咕，眼睛还盯着耳机线那头，"猛，是真的。"

+ [继续 # choice:dch01_s008_continue]
    -> dch01_s009

=== dch01_s009 ===
# scene:dch01_s009
走廊椅子上坐着个外国小伙，二十出头，书包没卸，英文场排号条快被捏烂了。他叫雷欧，来重庆读语言班，生活费靠给“心动引擎”测出海版。今天早到四十分钟，正拿翻译软件研究“深度体验”，研究半天，只确认这四个字很贵。

测试间里，苏明还在往下说。

+ [继续 # choice:dch01_s009_continue]
    -> dch01_s010

=== dch01_s010 ===
# scene:dch01_s010
"不是那种早就没话讲的分手。"他说，声音低了一些，"昨天晚上还好好的。"

+ [继续 # choice:dch01_s010_continue]
    -> dch01_s011

=== dch01_s011 ===
# scene:dch01_s011
昨晚吃完饭，两个人抢最后一块排骨，闹着挪进卧室，彼此都乐意。苏明脑子里那个叫“正常人”的开关一向好使——十二岁第一次发现自己跟旁人不太一样后，他摁了十六年，久到忘了为什么，只记得应该摁。

昨晚这个开关，偏偏没摁住。

+ [继续 # choice:dch01_s011_continue]
    -> dch01_s012

=== dch01_s012 ===
# scene:dch01_s012
进行到一半，他低下头，碰了碰陈佳的脚，鬼使神差地，张嘴咬了一下。

陈佳整个人瞬间僵住，像是被按了暂停键，连呼吸都停了一拍。她猛地一把推开他，声音发紧，带着点自己都没料到的惊恐："你干嘛？恶心。"

+ [继续 # choice:dch01_s012_continue]
    -> dch01_s013

=== dch01_s013 ===
# scene:dch01_s013
陈佳没尖叫，只剩扫兴、嫌弃和真没弄懂。骂完还能吵；这种反应连吵架的台阶都不给。

苏明伸手补救："逗你的逗你的。"陈佳嘴角松了半秒，又想起那一下不是玩笑，重新绷住。苏明偏把这半秒看成台阶，顺势把自己送进了死胡同。

+ [继续 # choice:dch01_s013_continue]
    -> dch01_s014

=== dch01_s014 ===
# scene:dch01_s014
"就一下。"苏明还想圆。

"正经的不好好搞，弄这个？"她扯过被子把自己裹起来，像是在防一个突然闯进来的陌生人，眼神里全是他没见过的那种冷，"你有病吧？"

+ [（回想时）把脸埋进掌心 # choice:d1_memory_shame]
    ~ dignity = dignity - 3
    -> dch01_s015
+ [（回想时）咬牙把后文讲完 # choice:d1_memory_hard]
    ~ impulse = impulse + 2
    -> dch01_s015

=== dch01_s015 ===
# scene:dch01_s015
"我就是……"他张了张嘴，一个字都没接上来。十六年攒下来的解释，真到了这个节骨眼上，愣是一句都掏不出来，脑子一片空白。

"你再这样，我们就分手。"

+ [继续 # choice:dch01_s015_continue]
    -> dch01_s016

=== dch01_s016 ===
# scene:dch01_s016
苏明那点死要面子的劲儿偏在这时冒头：越站不住理，越要拿嘴硬撑场。

"分就分，"他脱口而出，"谁稀罕。"

+ [继续 # choice:dch01_s016_continue]
    -> dch01_s017

=== dch01_s017 ===
# scene:dch01_s017
空气僵了两秒钟，谁都没再说话。

陈佳看着他，点了点头，语气平得反而叫人发毛："行，你睡沙发。"

+ [继续 # choice:dch01_s017_continue]
    -> dch01_s018

=== dch01_s018 ===
# scene:dch01_s018
门关上，反锁的声音清清楚楚传过来，跟平时吵完架故意甩门那种不一样——甩门是一时的气话，锁门是想清楚了的决定，这两种声音他分得清。

苏明躺在沙发上，把手机划开又锁上七八遍，一条像样的消息也没编出来。想敲门说软话，手伸到一半又缩回去——威风出口免费，收回来按尊严计费。

+ [继续 # choice:dch01_s018_continue]
    -> dch01_s019

=== dch01_s019 ===
# scene:dch01_s019
装到后半夜，他才慢慢想明白：这台阶是他自己拆的，还拆得挺利索，一脚踹得干干净净。

今早他进卧室拿充电器，陈佳脸上没什么表情，只丢下一句："钥匙放桌上，我想清楚了。"

+ [继续 # choice:dch01_s019_continue]
    -> dch01_s020

=== dch01_s020 ===
# scene:dch01_s020
一句轻飘飘的“想清楚了”，一路追进这间按分钟收购痛苦的小屋。

+ [继续 # choice:dch01_s020_continue]
    -> dch01_s021

=== dch01_s021 ===
# scene:dch01_s021
"你听起来在硬撑。"AI 忽然说，"是不是在假装坚强？"

苏明干笑了一声："你咋知道的？"

+ [继续 # choice:dch01_s021_continue]
    -> dch01_s022

=== dch01_s022 ===
# scene:dch01_s022
"你刚才那句话，比你前面的话慢了零点四秒。"AI 说，语气不紧不慢的，"人在撑的时候，会先把话在嘴里过一遍，才敢说出口。"

苏明坐直了些。它没听懂他的心，只量了语速、停顿、音高，再按模板出结果：此处应有安慰。

+ [继续 # choice:dch01_s022_continue]
    -> dch01_s023

=== dch01_s023 ===
# scene:dch01_s023
想明白这一层，他反而自在了点。跟一把尺子较什么劲呢，没什么好丢人的。

"我坚强得很，"他说，"超市搬货我都抢第一箱。"

+ [继续 # choice:dch01_s023_continue]
    -> dch01_s024

=== dch01_s024 ===
# scene:dch01_s024
"那你一定很难过，难过的时候更需要被抱一抱……"屏幕跳出一个粉色弹窗："深夜倾诉会员，开通后我陪你到天亮，首月立减。"

+ [关掉弹窗：别弹了 # choice:d1_close_popup]
    ~ closed_membership = true
    -> dch01_s025
+ [怼一句：任务听到这儿就行 # choice:d1_snipe_popup]
    ~ closed_membership = true
    ~ impulse = impulse + 2
    -> dch01_s025

=== dch01_s025 ===
# scene:dch01_s025
苏明手指一点，把它关掉："别弹了，任务听到这儿就行。"

"你知道吗，"AI 又切换了一套"知心大姐"模式，声音都换了个调调，"承认脆弱，才是真正的坚强。"

+ [继续 # choice:dch01_s025_continue]
    -> dch01_s026

=== dch01_s026 ===
# scene:dch01_s026
苏明差点笑出声来："行吧，你赢了，我很脆弱，满意了？"

耳机又换了套更黏糊的话术，一句句往他耳朵里灌。苏明应付着："行了行了，知道了，下一题。"他没被安慰，只是耳根发热——昨晚的狼狈已经打包成“痛点真实”，等着按档结算。

+ [继续 # choice:dch01_s026_continue]
    -> dch01_s027

=== dch01_s027 ===
# scene:dch01_s027
隔壁，那姑娘划下一个标签，小声跟同事总结："这条能用，痛点是真的。"

薯片袋子在她手里皱了一下，发出细微的响声。

+ [继续 # choice:dch01_s027_continue]
    -> dch01_s028

=== dch01_s028 ===
# scene:dch01_s028
雷欧在走廊上听得云里雾里，他的中文水平也就够辨认出"分手"这两个字，可那句"这条能用"倒是普通话里少有的、不用查字典也能听出杀伤力的一句话。他猛地站起身来，一把推开了旁边那扇门——推错了，正是质检室。

灯光刷地一下照出来，屋里几张脸齐刷刷转向他，架子上的耳机正外放着苏明的声音："分就分，谁稀罕。"

+ [继续 # choice:dch01_s028_continue]
    -> dch01_s029

=== dch01_s029 ===
# scene:dch01_s029
四目相对，谁都没先开口。

有人手忙脚乱地去拔线："例行质检，你走错门了，老外。"

+ [继续 # choice:dch01_s029_continue]
    -> dch01_s030

=== dch01_s030 ===
# scene:dch01_s030
雷欧中文说得不利索，可这股火气不需要语法撑腰："你们，听？偷听？This is shit."

+ [先听雷欧说完 # choice:d1_watch_leo]
    -> dch01_s031
+ [已经想冲前台 # choice:d1_rush_front]
    ~ impulse = impulse + 4
    -> dch01_s031

=== dch01_s031 ===
# scene:dch01_s031
苏明摘下耳机走出来，走廊里几道目光贴上来，粘乎乎的，甩都甩不掉。

有人拍他肩膀："想开点，兄弟。"姑娘递来纸巾，苏明莫名其妙："我鼻子没出血。"角落里测“银发陪伴”的大爷竖拇指；保安低头假装系鞋带——脚上分明是魔术贴。

+ [继续 # choice:dch01_s031_continue]
    -> dch01_s032

=== dch01_s032 ===
# scene:dch01_s032
休息区那头，一个大姐正对着测试门喊："我不是要挽留！我是要他道歉！"四周安静一拍，又恢复嘈杂。在这里，谁的痛苦都算不上新品。

"我咋了？"苏明问，声音里带着点没来由的委屈。

+ [继续 # choice:dch01_s032_continue]
    -> dch01_s033

=== dch01_s033 ===
# scene:dch01_s033
没人接话，哄地一下笑着散开了，跟刚看完一场不要钱的戏似的，看完了拍拍屁股就走。

走廊尽头，两名灰衣工人正把一只一人高的银色箱子推进货梯。标签写着：样机，勿倒置，硬件部。一个测聊天软件的公司，哪来的硬件部？货梯“哐当”合上，把答案一起运走了。

+ [继续 # choice:dch01_s033_continue]
    -> dch01_s034

=== dch01_s034 ===
# scene:dch01_s034
"Hey——苏？苏明？"雷欧从后头追上来，工牌歪挂在脖子上，"我是雷欧，Léo。我也测，英文场。"

"……哦。"苏明脚下没停。

+ [继续 # choice:dch01_s034_continue]
    -> dch01_s035

=== dch01_s035 ===
# scene:dch01_s035
"他们听。"雷欧比划着耳朵，中英文夹生地往外蹦，"Live，实时。不是你说完就没了。我听见他们笑了。"他测了十来场，今天推错一扇门，才知道“删干净”只管数据库，不管耳朵。

苏明脚步顿住了。

+ [继续 # choice:dch01_s035_continue]
    -> dch01_s036

=== dch01_s036 ===
# scene:dch01_s036
"说好删干净的。"

"库，"雷欧学着刚才那人的腔调，努了努嘴，语气里带着点讽刺，"他们说的是库。耳朵不算库。"

+ [继续 # choice:dch01_s036_continue]
    -> dch01_s037

=== dch01_s037 ===
# scene:dch01_s037
苏明转身就往前台走，脚步很快，几乎是小跑。

小组长还是那副职业笑，仿佛脸上焊死了这个表情。苏明把话摔过去："你们听着？我说话你们听着？"

+ [继续 # choice:dch01_s037_continue]
    -> dch01_s038

=== dch01_s038 ===
# scene:dch01_s038
"合规质检流程，协议第三页写得明白。"对方把平板转过来，指着一行小字，语气平稳得跟念说明书似的，"高价值补贴照发，您今天表现很好。"

"我表现个屁。"

+ [继续 # choice:dch01_s038_continue]
    -> dch01_s039

=== dch01_s039 ===
# scene:dch01_s039
"我给你们上差评，"苏明急了，声音都拔高了，"打你们客服电话投诉。"

"电话是外包的，"小组长语气比刚才还平，一点波澜都没有，"投诉受理时限十五个工作日，您可以试试。"

+ [在心里算房租和补贴 # choice:d1_calc_money]
    ~ dignity = dignity - 2
    -> dch01_s040
+ [再顶一句，再算账 # choice:d1_still_angry]
    ~ impulse = impulse + 2
    -> dch01_s040

=== dch01_s040 ===
# scene:dch01_s040
"不愿意测，随时可以不来。"小组长的语气没起伏，笑意倒添了一分，"双方自愿。"

房租、给他爸的钱、超市工资、补贴在脑子里排成一列。火气跟计算器打了一架，输了。

+ [继续 # choice:dch01_s040_continue]
    -> dch01_s041

=== dch01_s041 ===
# scene:dch01_s041
雷欧站在他侧后方，下巴一抬，替他撑场："他要谈，我也谈。你们也听我说。"

小组长看看雷欧，又看看苏明，笑意收了一半，只是重复："随时可以不来。"

+ [继续 # choice:dch01_s041_continue]
    -> dch01_s042

=== dch01_s042 ===
# scene:dch01_s042
就在这时，苏明的手机震了一下。

补贴到账短信。金额比平时高了一档，后面还跟着一行系统附言："情绪波动：优。恭喜升档！"

~ clue_subsidy_sms = true
+ [继续 # choice:dch01_s042_continue]
    -> dch01_s043

=== dch01_s043 ===
# scene:dch01_s043
他捏着手机，盯着这行字看了半天。他刚才在里面卖掉的那一晚，公司已经完成了验收、定价、付款，全套流程走下来不到十分钟，熟练得像流水线上的一道工序，谁都不心疼。小组长瞟了一眼他的屏幕，笑意反倒真诚了几分："看，公司不亏待用心的体验官。"

苏明牙咬得咯咯响，话到嘴边转了两圈，还是咽了回去："……算了，我还有事。"

+ [继续 # choice:dch01_s043_continue]
    -> dch01_s044

=== dch01_s044 ===
# scene:dch01_s044
那条短信他没删。留证据也好，留疤也好，反正都比删掉值钱。

出了楼道，夜风一灌进来，他才慢慢开口："得找房子了。昨晚等于把自己踹出门了。"他翻了一圈手机通讯录，能借宿的人不多——大学室友早结婚了，老家离得又远，剩下几个交情浅的，欠了人情反而更麻烦，想来想去，只剩找房子这一条路走得最省心。

+ [继续 # choice:dch01_s044_continue]
    -> dch01_s045

=== dch01_s045 ===
# scene:dch01_s045
雷欧来重庆不到一年，谈起租房却已经摆出“老重庆”的架势。

雷欧一拍脑门，掏出手机，中文磕磕巴巴地拨起了号："喂？房子……还招人不？我朋友要看，对，现在。"

+ [继续 # choice:dch01_s045_continue]
    -> dch01_s046

=== dch01_s046 ===
# scene:dch01_s046
听筒里漏出个女声，不耐烦，还带点重庆腔骂人的调调，隔着老远都听得出那股子干脆劲儿。

雷欧捂住话筒："你能出多少？"

+ [继续 # choice:dch01_s046_continue]
    -> dch01_s047

=== dch01_s047 ===
# scene:dch01_s047
"九百，顶天了。"

+ [九百，顶天了 # choice:d1_confirm_900]
    ~ budget_900 = true
    -> dch01_s048
+ [……能不能再少点（他没敢说出口） # choice:d1_whisper_less]
    ~ budget_900 = true
    ~ dignity = dignity - 1
    -> dch01_s048

=== dch01_s048 ===
# scene:dch01_s048
雷欧对着听筒喊："九百？OK……地址发我，现在。"

挂了电话，他把定位甩了过来。

+ [继续 # choice:dch01_s048_continue]
    -> dch01_s049

=== dch01_s049 ===
# scene:dch01_s049
"今晚能看。石家小楼，那女的嘴很凶，"他想了半天才凑出一句中文，"但不乱，No chaos。"

苏明盯着导航上那条弯弯曲曲的旧巷子，没吭声，转身就往那个方向走去。

+ [继续 # choice:dch01_s049_continue]
    -> dch01_s050

=== dch01_s050 ===
# scene:dch01_s050
"先看房。"他打断了雷欧还想往下说的话，"有地方睡再说。"

+ [继续 # choice:dch01_s050_continue]
    -> d1_chapter_end

=== d1_chapter_end ===
# scene:d1_chapter_end
导航把他们领进那条弯弯曲曲的旧巷。
+ [进巷子 # choice:d1_go_housing]
    -> END

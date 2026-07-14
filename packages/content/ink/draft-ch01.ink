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

工作人员这句话说出口的时候，手指正点在协议签字页上，笑得跟卖保险的一样职业，那种笑法练了不知道多少年，嘴角弧度都是标准的。苏明这才有空打量起这间屋子——四面钉着蜂窝状的隔音棉，摸上去凉丝丝的，带一点橡胶味，天花板正中央嵌着一个鱼眼摄像头，镜头边缘那颗红点常年亮着，不闪，也不熄，像一只从不眨眼的眼睛，安安静静地盯着底下发生的一切。桌上摆着一块平板，靠背椅是那种网吧同款的人体工学椅，只不过换了个说法，叫"沉浸座椅"——听着高级，坐进去才知道，跟网吧那把椅子没什么两样，弹簧一样会硌人。

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
这话苏明听完，心里那点疑虑没散，倒是多了一层新的——他信的从来不是"绝对删干净"这五个字，是"骨头留着"这半句更实在。这些年他练出来一条经验，跟长茧子似的，磨出来的，不是天生的：凡是写着"绝对"两个字的东西，十有八九留了后门。眼前这位倒难得没藏着掖着，直接把后门指给他看了。

门关上，隔音棉把外头的声音都吸走了，耳机里响起一个女声，声音甜得刚刚好，不腻，客服跟情人那味道各掺了一半："你好呀，今天过得怎么样？"

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

这份兼职的招募说明写得挺客气，客气得让人挑不出理来：面向情感表达能力强、愿意深度参与产品迭代的社会人士，招募人体样本，非全职非算法岗，按场次结算。翻译成大白话，其实就一句：你痛得越真，公司挣得越多。苏明早算过这笔账了，一场深度体验顶他在超市站三天收银台，钱是真香，脸皮嘛，早在第一次测试的时候就已经放到地上踩过一回了，用不着这回再专门放一遍——那点难为情，第一次就已经交过学费了。

+ [继续 # choice:dch01_s006_continue]
    -> dch01_s007

=== dch01_s007 ===
# scene:dch01_s007
这也不是他头一回测。上个月他刚测过一场"职场受气经历"，编了个被甲方骂哭的桥段，添油加醋讲得跟真的一样，事后系统给他打了"情绪波动：优"，档位直接跳了一级，补贴也跟着涨。编的时候他心里一点负担都没有，讲得眉飞色舞。可这回是真事，他反倒有点不适应——编故事的时候是演员，讲真事的时候，倒像是在人前脱衣服，一件一件往下扒，扒到最后光溜溜地站在那儿，什么都藏不住。

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
走廊椅子上坐着个外国小伙，二十出头，书包还没卸下来，手里攥着张英文场次的排号条，捏得都有点皱了。他是雷欧，来重庆读语言班快一年了，学费家里出，生活费得自己想办法——想来想去，他这张外国脸最值钱的地方，大概就是能测"心动引擎"正准备出海的英文版了。今天他提前了整整四十分钟到，心想着先适应适应这地方的气氛，别到时候紧张出岔子，此刻正对着手机翻译软件研究"深度体验"这四个字到底是什么意思，翻来覆去看了好几遍还是没弄明白。门缝里飘出一句中文，他先是没听懂，皱着眉又听了一遍，还是没听懂，索性作罢。

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
昨晚吃完饭，两个人抢最后一块排骨，酱汁蹭到陈佳嘴角，他伸筷子想去刮，她笑他手贱，躲了一下没躲开，两人就这么闹着挪进了卧室，灯没关，气氛热得很，谁都乐意，一步一步往下走，谁也没觉得哪里不对劲。这种时候苏明脑子里通常有个开关，他心里管它叫"正常人"，摁一下能管大半天——十二岁那年他第一次发现自己跟旁人不太一样，那种发现来得又突然又羞耻，此后十六年他就靠这一句话，一次又一次把那点念头摁回去，摁得次数多了，连他自己都快忘了当初为什么非要摁，只记得摁下去就对了。

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
不是尖叫，也不是那种当场要报警的架势。是真扫兴，真嫌弃，真的没弄明白他脑子里刚才在想什么——这三样东西加在一起，比劈头盖脸骂他一顿更让人没地方躲，骂完了还能吵，这种反应让人连吵的余地都没有。

苏明想拿平时哄她的那套招数补救回来，伸手想把气氛拉回去："逗你的逗你的。"陈佳被他这句话噎了一下，嘴角刚要松下来，可脑子里又想起刚才那一下不是闹着玩的，硬生生把脸重新绷住了——这半秒钟的松动，恰恰叫苏明看走了眼，他以为还有转圜的余地，才由着自己的性子往下辩解，一步一步把自己往死胡同里带。

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
苏明那点死要面子的劲儿，偏偏在这个时候冒了头——这是年轻男人常犯的毛病，越是站不住理，越要嘴硬撑着场子，越怕软下来会被看轻。

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

苏明躺在沙发上，手机屏幕亮了又灭，他划开又锁上，划开又锁上，来来回回划了七八遍，一条像样的消息也没编出来。想过去敲门讲两句软话，手伸到一半又缩了回来——话说出去的时候是威风，收回来的时候就成了讨饶，他丢不起这个人，这大概是他这辈子最贵的一次要面子，比任何一次都贵。

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
没有当众处刑，也没有闪送三连虐，就这么淡淡一句，反倒够他硬撑一整天——甚至硬撑到了现在，硬撑到了这间四面钉着隔音棉、专门收集别人痛苦的小屋子里。

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

苏明愣了一下，坐直了些。它不是听懂了他的心，它是掐了他的表。这机器压根不知道什么叫难过，它只是在量他——语速、停顿、音高，一样一样量完了对表，表上早写好了结论：此处应有安慰。

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

耳机没死心，又换了一套更黏糊的安慰话术，声音压得又软又慢，跟哄小孩似的，一句一句往耳朵里灌。苏明嘴上应付着："行了行了，知道了，下一题。"他心里却没热一下——不是他没心没肺，是这场戏演到这份上，他自己心里跟明镜似的，图的是补贴，把昨晚那点狼狈打包卖成了一份"痛点真实"的样本。要说热，也就耳根子热了一下，那是臊的，不是感动的，这中间的差别他分得清清楚楚。

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

有人拍他肩膀："想开点，兄弟。"有人眼神发飘，明显是憋着笑又不敢当着他的面笑出来。一个姑娘递过来一张纸巾，苏明莫名其妙："我鼻子没出血。"姑娘讪讪地收回手，脸上有点尴尬。角落里还坐着个大爷模样的测试员，估计是来测"银发陪伴"那个场次的，也冲他竖了个大拇指，什么话都没说，那意思大概是"经历过，理解你"。还有个穿工装的保安，假装盯着监控屏幕看，眼神却一直往这边瞟，被苏明抬眼撞见了，慌忙低下头假装系鞋带——他脚上那双分明是魔术贴的。

+ [继续 # choice:dch01_s031_continue]
    -> dch01_s032

=== dch01_s032 ===
# scene:dch01_s032
休息区那头，一个大姐正对着某间测试门喊："我不是要挽留！我是要他道歉！"喊完她自己也愣住了，像是没料到这句话能在这种地方脱口而出，四周瞬间安静了一拍，紧接着又若无其事地恢复了原来的嘈杂——这地方什么样的场面都见过了，谁的痛苦在这儿都算不上什么新鲜事。

"我咋了？"苏明问，声音里带着点没来由的委屈。

+ [继续 # choice:dch01_s032_continue]
    -> dch01_s033

=== dch01_s033 ===
# scene:dch01_s033
没人接话，哄地一下笑着散开了，跟刚看完一场不要钱的戏似的，看完了拍拍屁股就走。

走廊尽头，两个穿灰色工装的人正推着一只一人高的银色箱子往货运电梯里挪，箱子上贴着一张标签，字挺大：样机，勿倒置，硬件部。苏明多看了一眼——这栋楼哪来的硬件部？一个测聊天软件的公司，跟硬件能有什么关系？货梯门"哐当"一声合上，没人出来解释一句。他也没多想，转念一想，或许是公司别的部门，跟他没什么相干，这念头一闪就过去了。

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
"他们听。"雷欧比划着自己的耳朵，中英文夹生地往外蹦，"Live，实时。不是你说完就没了。我听见他们笑了。"他这半年测了不下十场，每次工作人员都信誓旦旦说"绝对删干净"，他一直信着，直到今天推错了门，才算亲眼撞见了真相——这大概是他在中国交的学费里，最贵也最值的一课，学费不是钱，是这一路走来攒下的天真。

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
"不愿意测，随时可以不来。"小组长的语气始终没起伏，笑意倒是又添了一分，"双方自愿。"

苏明脑子里飞快地过了一遍账：房租、给他爸的钱、超市工资，还有眼前这份补贴——这几笔加在一起，比他这点面子实在多了，实在得让他没法不低头。他往前迈了半步，又生生收了回来，脚底下那点火气，跟脑子里那台计算器打了一架，打输了，输得干干净净。

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
不是怂成一滩泥。他心里明白，这地方今天要是撕破脸，亏的是自己下个月那笔钱，人在屋檐下，账他会算，脸他能忍，这笔账他从来都算得很清楚。只是那条短信他没删掉——说不清是留个证据，还是留个疤，反正就那么留着，没舍得点删除。

出了楼道，夜风一灌进来，他才慢慢开口："得找房子了。昨晚等于把自己踹出门了。"他翻了一圈手机通讯录，能借宿的人不多——大学室友早结婚了，老家离得又远，剩下几个交情浅的，欠了人情反而更麻烦，想来想去，只剩找房子这一条路走得最省心。

+ [继续 # choice:dch01_s044_continue]
    -> dch01_s045

=== dch01_s045 ===
# scene:dch01_s045
雷欧看他这副丧气样，倒想起了自己刚来重庆那阵子：语言学校宿舍到期，他也是提着行李满大街找房，最后靠语伴群里一个学姐介绍才落了脚。他现在俨然把自己摆在了"老重庆"的位置上——尽管他来这儿满打满算还不到一年，说起本地的门道来倒是一套一套的。

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
苏明盯着导航上那条弯弯曲曲的旧巷子，没吭声，转身就往那个方向走去。
「先看房。」他打断了雷欧还想往下说的话，「有地方睡再说。」
+ [先看房 # choice:d1_go_housing]
    -> END

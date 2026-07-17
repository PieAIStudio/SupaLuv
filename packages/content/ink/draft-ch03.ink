// 第三章 长按七秒 — densified from supa-luv-v2 ch03 (2026-07-16).
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

-> dch03_s001

=== dch03_s001 ===
# scene:dch03_s001
匹配问卷来的时候，苏明正在超市收银台后头扫二维码。手机屏幕点亮，推送通知一行字：“您的个性化匹配问卷已生成，请于72小时内完成填写。”旁边一个大姐正把一整袋番茄推到扫码区。
脸型那一页，可以上传照片让系统自动生成，也可以在基础模板上手动微调。苏明的手指在相册图标上停了好几秒。相册里有几张没删干净的合照——跟陈佳的，手机换过一次，同步回来了；当时没注意，后来删了大部分，剩几张，不是留着看，就是没狠心点删除。

+ [继续 # choice:dch03_s001_continue]
    -> dch03_s002

=== dch03_s002 ===
# scene:dch03_s002
他最终没有点开相册图标。选了基础脸17号，用手指一点一点往下调：鼻梁调低了那么一点，眼睛调成上挑，调完了盯着预览图看了好半天。说不上像谁，又说不上不像谁。他强迫自己不去细想，点了下一步。
就在这时，手机震了一下。陈佳：“我有件外套放那边了，什么时候方便我过来拿一下。”

+ [继续 # choice:dch03_s002_continue]
    -> dch03_s003


=== dch03_s003 ===
# scene:dch03_s003
苏明看了看屏幕上那张还在预览中的脸，又看了看微信里这个名字，想了一会儿，打了三个字：“明天吧。”发完继续调鼻梁。
性格页全是密密麻麻的滑块：顺从度、依恋度、洁癖、控制欲、争吵频率，一条一条排开。每个滑块下面都挂着别的体验官留下的评价。“记仇时长”那栏热评第一条：千万别调永久，我调了，她现在还记着我三月份说她面条咸。苏明盯着这条评价看了好一会儿。

+ [选基础脸，别开相册 # choice:d3_face_template]
    ~ face_choice = "template"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> dch03_mobile_questionnaire
+ [手指在相册上停太久 # choice:d3_face_album]
    ~ face_choice = "album_hover"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
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
手机问卷 1/3 · 邻居容忍度。
+ [一般 # choice:mobile_questionnaire_q1_average]
    ~ mobile_questionnaire_q1 = "average"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [良好 # choice:mobile_questionnaire_q1_good]
    ~ mobile_questionnaire_q1 = "good"
    ~ ai_score = ai_score + 3
    ~ mianzi = mianzi - 3
    -> q2
+ [优秀 # choice:mobile_questionnaire_q1_excellent]
    ~ mobile_questionnaire_q1 = "excellent"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> q2
+ [不愿评价 # choice:mobile_questionnaire_q1_decline]
    ~ mobile_questionnaire_q1 = "decline"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> q2
+ [跳过问卷 # choice:mobile_questionnaire_q1_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= q2
# scene:dch03_mobile_questionnaire
# interaction:mobile-questionnaire-v1
# interaction-step:2
手机问卷 2/3 · 是否介意设备高度拟人。
+ [介意 # choice:mobile_questionnaire_q2_mind]
    ~ mobile_questionnaire_q2 = "mind"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> q3
+ [不介意 # choice:mobile_questionnaire_q2_fine]
    ~ mobile_questionnaire_q2 = "fine"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    -> q3
+ [不确定 # choice:mobile_questionnaire_q2_unsure]
    ~ mobile_questionnaire_q2 = "unsure"
    ~ ai_score = ai_score + 3
    -> q3
+ [跳过问卷 # choice:mobile_questionnaire_q2_skip]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> skipped

= q3
# scene:dch03_mobile_questionnaire
# interaction:mobile-questionnaire-v1
# interaction-step:3
手机问卷 3/3 · 独立房间。
+ [有独立房间 # choice:mobile_questionnaire_q3_yes]
    ~ mobile_questionnaire_q3 = "yes"
    ~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
    -> result
+ [暂无 # choice:mobile_questionnaire_q3_no]
    ~ mobile_questionnaire_q3 = "no"
    ~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
    -> result
+ [可改造 # choice:mobile_questionnaire_q3_convertible]
    ~ mobile_questionnaire_q3 = "convertible"
    ~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
    -> result
+ [跳过问卷 # choice:mobile_questionnaire_q3_skip]
    -> skipped

= skipped
~ mobile_questionnaire_skipped = true
~ mobile_questionnaire_completed_at_version = "mobile-questionnaire-v1"
-> result

= result
# scene:dch03_mobile_questionnaire
{ mobile_questionnaire_skipped:
    问卷页缩成一条“稍后再填”。保密承诺第七条仍加着粗。
- else:
    三道题交完，提交钮还在下一屏等他。苏明把手机屏幕亮度又调暗了一格。
}

+ [继续 # choice:mobile_questionnaire_continue]
    -> dch03_s004

=== dch03_s004 ===
# scene:dch03_s004
他把“记仇时长”的滑块往永久拖了一下，又默默拖了回来，停在零秒。顺从度拉满，控制欲清零。预览生成感官偏好那一页，才真正让他手心冒起了汗。足弓高度、脚趾形态、皮肤纹理、反馈灵敏度——这些他从来不敢跟任何一个活人提起的东西，在这张表格里手机这时候又震了一下。陈佳：“能不能今天？那件外套比较急。”

+ [继续 # choice:dch03_s004_continue]
    -> dch03_s005

=== dch03_s005 ===
# scene:dch03_s005
苏明把感官偏好那页提交了，然后回陈佳：“行，傍晚。”陈佳来的时候是下午六点多，苏明还没下班，请了半小时早退，老板娘嘴里念叨着让他改天多还一个钟，目送两个人在石家小楼门口碰上，陈佳从包里把那件外套递给苏明，苏明这才想起来，是她几个月前落在他原来那“谢谢你保管。”“没事。”苏明把外套还给她。

+ [继续 # choice:dch03_s005_continue]
    -> dch03_s006

=== dch03_s006 ===
# scene:dch03_s006
两个人都没先走，都在等对方先走。巷子里这个时间有点吵，有人推着三轮车过来，两人各往一边让了让，三轮车过去了，两人又站回了原来的位置。
还是陈佳先开口：“你住这边了？”“对。”“挺好的。”她说完转身走了。苏明站在门口目送，没看她走进巷子，转身进楼，上了3F，打开房间门——签约培训的页面还开着，他昨晚做到一半睡着了。

+ [回陈佳：明天吧 # choice:d3_coat_tomorrow]
    ~ coat_timing = "tomorrow"
    ~ mianzi = mianzi + 3
    -> dch03_s007
+ [回陈佳：行，傍晚 # choice:d3_coat_today]
    ~ coat_timing = "today"
    ~ mianzi = mianzi - 5
    -> dch03_s007

=== dch03_s007 ===
# scene:dch03_s007
《对外统一口径建议话术》，三选一：美术用品、健身假人、医疗康复道具。他把屏幕往旁边扫了一眼，视线落到窗外巷子，陈佳已经不见了，然后回头做完了这道题。结业考试错了两道，重考才过。这家公司连怎么撒谎都替人想好了标准答案，诚实这个东西，在这里是不及格项。
等货的两周，物流页面被他刷出了包浆。“排产中”看了四天，“质检中”又看了三天，第三件货卡在“安检查验中”两天。苏明夜里躺在床上胡思乱想，凌晨两点憋不住把恐惧发进“相依为命”群。老K秒速回来：安检员见这类货比快递小哥见得还多，内部管这叫“仿真件”，睡你的觉去吧。
底下有群友补充：他那件当年被开箱验过，安检小哥检查完了，重新给封好，淡淡说了一句：“胶带我给你缠结实点，路上颠。”

+ [继续 # choice:dch03_s007_continue]
    -> dch03_s008

=== dch03_s008 ===
# scene:dch03_s008
三天后货物恢复派送。到货那天，苏明跟老板娘谎称亲戚来，请了半小时假。“你哪来那么多亲戚，三天两头——去吧去吧，多一秒扣钱。”她一边说一边把他往门外推。
半小时刚过没几分钟，老板娘短信追来：“我这边缺人。”苏明捏着手机回了个“马上”，眼睛一直盯着巷口那辆倒车的货车，脚步没挪一步。
快递员卸下三个大箱子，累得只吐一个字：“重。”撕回执的时候顺嘴调侃：“兄弟，这假人比真人金贵吧，保养好点。”

+ [继续 # choice:dch03_s008_continue]
    -> dch03_s009

=== dch03_s009 ===
# scene:dch03_s009
纸箱上印着“健身假人 / 模特道具”，字大得生怕别人看不见——这是这行的门道：与其藏着掖着，不如就在这时，三个初中女生放学路过，背着书包，看见三个大箱子堆在巷口，其中一个往前走了两步：“要帮忙吗？”苏明刚想说不用，雷欧从他旁边闪出来，已经把最轻的那只箱子叫她们帮着扶稳了：“谢谢，上楼，小心点！楼梯窄，拐角紧，三箱往上搬，卡了两回。

+ [继续 # choice:dch03_s009_continue]
    -> dch03_s010

=== dch03_s010 ===
# scene:dch03_s010
初中女生三个人扶着中间那只箱子，配合着往上挪，苏明踩在她们前面。转到二楼和三楼之间那个弯角，空间太小，苏明侧着身子托着箱子，脚下没站稳，踩偏了一级台阶——箱子跟着侧倒，撞在墙角上。
侧面的纸板豁开了。一只手从豁口弹了出来，手指张开，仰着，停在空中。三个女生愣了两秒，尖叫还没来得及喊出来——箱子又往下错了一截，豁口扩大，躯干上半段跟着滑了出来，硅胶的皮肤在楼道灯下泛着哑光。
尖叫这次真的来了，而且是三个人同时的。三人踩着彼此往楼梯下冲，有人踩了另一个人的脚，有人撞了一下扶手，三双鞋跑到巷口。

+ [继续 # choice:dch03_s010_continue]
    -> dch03_s011

=== dch03_s011 ===
# scene:dch03_s011
苏明站在半截楼梯上，一手扶着箱子，一手把那只手往里按，来不及解释，来不及做任何事。他把头压低，盯“有个手！”“还有胸！是真的！”“打110！”楼道里顿了一下。

+ [继续 # choice:dch03_s011_continue]
    -> dch03_s012

=== dch03_s012 ===
# scene:dch03_s012
雷欧从苏明身边往楼梯口慢慢挪了一步，眼神往巷口方向瞄了一下，低声说：“……我学生签证，警察那边我苏明没说话，雷欧又往楼梯口退了一步。“我在楼道口等你。”“你去吧。”雷欧下楼了，脚步很轻。苏明一个人扛着箱子，把那只手使劲往里按进去。

+ [继续 # choice:dch03_s012_continue]
    -> dch03_s013

=== dch03_s013 ===
# scene:dch03_s013
不到五分钟，黄老太循声从巷口走过来了，手机已经打出去了，是网格员小袁的号。巷子里围过来六七个邻居两个便衣警察到了，一个年轻一个老的。老的在外面维持秩序，年轻的跟着苏明上楼。苏明进了房间，把箱子搁下，掏出手机，把心动引擎的测试合同页面给警察看——协议编号、签署时间、“实警察低头看了两眼，抬起头，对着苏明慢慢扬了扬眉毛。意思很明显。

+ [继续 # choice:dch03_s013_continue]
    -> dch03_s014

=== dch03_s014 ===
# scene:dch03_s014
苏明点了点头。警察又扬了扬眉毛。意思还是很明显。苏明又点了点头。警察叹了口气：“你是看不懂眼神吗。”

+ [继续 # choice:dch03_s014_continue]
    -> dch03_s015

=== dch03_s015 ===
# scene:dch03_s015
苏明：“警官，我能看懂。但我需要你明说，我才有合理的解释给你。”警察盯着他看了两秒，没接这话，换了个方向：“箱子得开一下。我来核实。”
苏明把那只豁开的箱子推过去。警察蹲下来，把豁口撑开，往里看了看，然后伸手捏了一下里头滑出来的手腕，又在小臂上按了按，感受了一下硅胶的弹性，站起来。他什么都没说。
又走到另一只箱子旁边，把顶部划开，翻出里头的腿——大腿、小腿、关节都有包装编号。他拿起来看了一眼，又放回去。

+ [继续 # choice:dch03_s015_continue]
    -> dch03_s016

=== dch03_s016 ===
# scene:dch03_s016
第三只箱子他只扫了一眼人头的部分，低头在本子上记了什么，然后把本子合上了。“属于合法私人测试设备，我们处理完就撤。”他伸出手，示意苏明先走。走到楼道门口，年轻警察正要往下走——门口挤进来了网格员小袁，黄老太跟在后面，那三个初中女生堵在楼警察被堵住了，叹了口气，转头看向苏明：“你要不跟我去走个过场？”苏明：“我有正规合同，有平台资质，我凭什么做笔录？”

+ [继续 # choice:dch03_s016_continue]
    -> dch03_s017

=== dch03_s017 ===
# scene:dch03_s017
僵住了，谁都没先动。石佩欣从楼上走下来。她在楼道里看了一圈，没说废话，直接开口：“人体模特你们没见过吗？”黄老太：“模特要装电？”石佩欣转头看着她，语气平静：“你去商场，橱窗里那些会走动的模特，里头有没有电机？你举报过商场吗？

+ [继续 # choice:dch03_s017_continue]
    -> dch03_s018

=== dch03_s018 ===
# scene:dch03_s018
网格员小袁耳根发红，往后退了半步。三个初中女生对视了一眼，悄悄放开了苏明的袖子——她们什么时候抓上去的苏明都不知道。年轻警察把本子插回口袋，朝苏明点了个头，带着老警察下楼走了。
人散了。箱子还在楼道里，三部分散着。楼梯口走上来一个人——雷欧，一脸若无其事，好像刚从外面买了瓶水回来，手里确实攥着一罐矿泉水。他看了一眼散落在地上的部件，看了一眼苏明，没说废话，直接弯腰扛起两条腿，大摇大摆往楼梯上走。

+ [继续 # choice:dch03_s018_continue]
    -> dch03_s019

=== dch03_s019 ===
# scene:dch03_s019
石佩欣抱着头，在楼道灯下端详了两秒：“做工不错，挺像真人的。”苏明两手抱着胸和腰，用自己的外套裹着，低着头走在最后。三个人踩着旧楼梯上楼，脚步声咯吱咯吱的，谁都没说话。把所有东西放到3F-A门口，当天晚上三个人还是一起吃了饭。饭桌上，石佩欣拿筷子敲了敲碗沿：“人体模特多少钱一个？”

+ [让雷欧先走，签证要紧 # choice:d3_leo_go]
    ~ mianzi = mianzi + 3
    -> dch03_s020
+ [想留他一起扛箱子 # choice:d3_leo_stay]
    ~ mianzi = mianzi - 3
    -> dch03_s020

=== dch03_s020 ===
# scene:dch03_s020
苏明：“……不清楚，代收的，亲戚公司的。”“代收还分三箱。”石佩欣盯着他，“给个能写进亲戚聊天框的说法。”“美术用品，你画画要用。”“我画男的。”她瞥了他一眼，语气里带着点警告，“你那箱子最好别长得像真人。”雷欧举手：“如果长得像真人，我搬走。”

+ [继续 # choice:dch03_s020_continue]
    -> dch03_s021

=== dch03_s021 ===
# scene:dch03_s021
“你敢。房租预付了。”窗外恰好飘进来黄老太的一句话，隔着好几户都听得清清楚楚：“说是模特，哪个模特要装电哟？”三双筷子同时停住了。石佩欣起身把电视音量调大了两格，权当那句话从来没有飘进来过。一桌人各怀鬼胎地把这顿饭吃完了。把所有东西搬进3F-A，雷欧还想凑热闹。

+ [继续 # choice:dch03_s021_continue]
    -> dch03_s022

=== dch03_s022 ===
# scene:dch03_s022
“我能帮开箱吗？”“不用，出去。”“万一是炸——”“不是炸弹。出去。”门在他脸前锁上了。

+ [继续 # choice:dch03_s022_continue]
    -> dch03_s023

=== dch03_s023 ===
# scene:dch03_s023
苏明对着说明书准备自己拼，石佩欣站在门口看了一会儿，说她朋友让她帮组过美术人台，逻辑一样，她可以两个人对着拼了一个小时。装左臂关节的时候“嘎嘣”一声，苏明吓得手缩回去，脊背一阵发麻，以为弄坏了什么。石佩欣翻了一下说明苏明的心跳才慢慢回来。最后一步：说明书最后一页，加粗：“长按后颈七秒，首次绑定需语音命名。”

+ [继续 # choice:dch03_s023_continue]
    -> dch03_s024

=== dch03_s024 ===
# scene:dch03_s024
苏明的手指找到后颈那个位置，指腹压上去，在心里开始数：一，二，三。数到三，手缩了回来。石佩欣看了一眼机器人，又看了一眼苏明，从门边走进来，蹲下来看了看机器人的领口。“等一下。”她起身出去，几十秒后回来，手里多了一件洗干净叠好的旧T恤——她自己的，深灰色，洗得起了毛。“你总不能让人家光着上阵。”两人把T恤给机器人套上，整理好领口和袖口。
然后才是那最后一步。苏明的手指重新压上去。

+ [继续 # choice:dch03_s024_continue]
    -> dch03_s025


=== dch03_s025 ===
# scene:dch03_s025
在心里开始数：一，二，三——数到三，手又缩了回来。石佩欣看着他，没说话。苏明深吸一口气，又把手指压上去，这次没停：一二三四五六七。
机器人缓缓睁眼。睫毛先动，然后是眼睑，然后是瞳孔在灯光下对好焦。停了大约两秒，它开口了，声音比苏明预想的更低一点，也更平静：“你好。”

+ [继续 # choice:dch03_s025_continue]
    -> dch03_s026


=== dch03_s026 ===
# scene:dch03_s026
睫毛先动，然后是眼睑，然后是瞳孔在灯光下对好焦。停了大约两秒，它开口了，声音比苏明预想的更低一点“你好。”苏明回了一声“你好”，嗓子有点哑。“我的名字是——”

+ [继续 # choice:dch03_s026_continue]
    -> dch03_s027

=== dch03_s027 ===
# scene:dch03_s027
它说出了那个名字。陈佳。两个字，被一台机器的嘴说出来，停在屋子里，苏明愣了好几秒没动。石佩欣抬起头看了一眼苏明，然后问机器人：“这名字……是什么意思？”机器人朱珠的眼睛在石佩欣身上停了一秒，然后把视线移回到苏明脸上。

+ [数到三就缩手 # choice:d3_press_hesitate]
    ~ longpress_hesitation = "hesitate"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 5
    -> dch03_s028
+ [一口气数满七秒 # choice:d3_press_commit]
    ~ longpress_hesitation = "commit"
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 8
    -> dch03_s028

=== dch03_s028 ===
# scene:dch03_s028
苏明：“……就随便取的。”机器人朱珠看着他，专注得不像机器的眼神，停了一下，才开口：“不是随便取的。这是你前女友的名字。你把我的样子也调成了她。”“我没有。”

+ [继续 # choice:dch03_s028_continue]
    -> dch03_s029

=== dch03_s029 ===
# scene:dch03_s029
“你能不能不把我当替代品，而是当成真正一个人？”她盯着他，等他回答。石佩欣从地上站了起来，往门口走，手指勾住门把手，没有回头。苏明望着那双眼睛，想说什么，嘴张了两下，最后说出来的是：“……好。好好好好好。”

{ face_choice == "template":
    他记得自己没点相册——可机器还是把名字和轮廓认了出来。
}
{ face_choice == "album_hover":
    相册图标上停过的那几秒，像已经替他勾过答案。
}

+ [……就随便取的 # choice:d3_name_casual]
    ~ name_response = "casual"
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch03_s030
+ [好。好好好好好 # choice:d3_name_accept]
    ~ name_response = "accept"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 5
    -> dch03_s030

=== dch03_s030 ===
# scene:dch03_s030
机器人朱珠看着他，嘴角动了一下，像是满意。“好。那今天，我会好好伺候你的。”门带上了，石佩欣走了。屋子里就剩他们两个，一个人，一台机器，和一盏灯。

+ [继续 # choice:dch03_s030_continue]
    -> d3_chapter_end

=== d3_chapter_end ===
# scene:d3_chapter_end
屋子里就剩他们两个，一个人，一台机器，和一盏灯。
+ [关灯前再看一眼 # choice:d3_end_look]
    -> END

// 第二章 她不会评判你 — densified from supa-luv-v2 ch02 (2026-07-16).
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
不评判。
{ frontdesk_response == "calculate":
    白天工资、晚上补贴又在脑子里排队；前台那次火气输给计算器，现在计算器成了排班表。
}
{ frontdesk_response == "angry":
    他手腕扫得更快，像还在跟那张前台笑脸顶嘴；可两份工一班没少，火气照样得打卡。
}
前台那次还在：现在计算器成了排班表，火气照样得打卡，两种输法他都试过。

有用。苏明站在收银台后头，视线已经跟了那孩子有一阵了。她在辣条货架前假装比口味——翻一包看看背面，再拿另一包翻翻，动作悠闲，眼神却没往柜台这边飘过一下第三次了。苏明认得这件校服的颜色。他在这家叫“惠万家”的小超市干了快半年了——门脸两米宽，货架挤得侧身才能过，店名听着气派，实际能他绕出收银台，走过去，把平板转过来给她看。监控画面停在那儿，时间戳清清楚楚。

+ [继续 # choice:dch02_s001_continue]
    -> dch02_s002

=== dch02_s002 ===
# scene:dch02_s002
“这是你第三次了。”小女孩先不说话。她抬起头看他，神情平静得不像这个年纪——不像是被抓住的人，更像是坐在谈判桌对面的两个人沉默了大概有四五秒。然后她开口了。“我是不是……太冷静了？”
“这是你第三次了。”
然后她开口了。

+ [继续 # choice:dch02_s002_continue]
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
收银台练习 1/3 · 临期辣条。
+ [扫过这一单 # choice:barcode_sweep_q1_ok]
    ~ barcode_sweep_q1 = "ok"
    -> q2
+ [跳过连扫 # choice:barcode_sweep_q1_skip]
    -> skipped

= q2
# scene:dch02_barcode_sweep
# interaction:barcode-sweep-v1
# interaction-step:2
收银台练习 2/3 · 冰红茶。
+ [扫过这一单 # choice:barcode_sweep_q2_ok]
    ~ barcode_sweep_q2 = "ok"
    -> q3
+ [跳过连扫 # choice:barcode_sweep_q2_skip]
    -> skipped

= q3
# scene:dch02_barcode_sweep
# interaction:barcode-sweep-v1
# interaction-step:3
收银台练习 3/3 · 桶装方便面。
+ [扫过这一单 # choice:barcode_sweep_q3_ok]
    ~ barcode_sweep_q3 = "ok"
    ~ barcode_sweep_completed_at_version = "barcode-sweep-v1"
    -> result
+ [跳过连扫 # choice:barcode_sweep_q3_skip]
    -> skipped

= skipped
~ barcode_sweep_skipped = true
~ barcode_sweep_completed_at_version = "barcode-sweep-v1"
-> result

= result
# scene:dch02_barcode_sweep
{ barcode_sweep_skipped:
    练习模式关掉。老板娘在后头喊：“别玩系统，货堆着。”
- else:
    三声“嘀”叠在一起。苏明手腕还记得节奏：白天扫条码，晚上被 App 扫灵魂。
}

+ [继续 # choice:barcode_sweep_continue]
    -> dch02_s003

=== dch02_s003 ===
# scene:dch02_s003
苏明刚想接话，小女孩嘴一撇，两颗泪挤了出来，嘴角还没完全垮下去，泪就先到了。“大哥哥，我真的错了。”苏明愣了整整一秒钟，什么话都没出来。

+ [按住手腕：拿出来 # choice:d2_catch_firm]
    ~ child_response = "firm"
    ~ mianzi = mianzi + 5
    -> dch02_s004
+ [声音放轻一点，还是要拿出来 # choice:d2_catch_soft]
    ~ child_response = "soft"
    ~ mianzi = mianzi + 3
    -> dch02_s004


=== dch02_s004 ===
# scene:dch02_s004
{ child_response == "firm":
    苏明松开手时，掌心还留着按下去的力道；规矩办完了，围观的人才刚进场。
}
她回看他，眼神又变回了那种平静的。

{ child_response == "soft":
    苏明先松开手，声音却没退：“拿出来。”克制不是撤单，只是不给围观的人加戏。
}
那颗心回来以后，他做了个决定：叫老板娘出来处理。他掏出手机拨号，电话接通，“喂”字刚出口——小女孩从他旁边走过来，两只小手捂住他握手机的那只手，摁着不让他动。等他想明白，小女孩已经松手开跑了。苏明追出去，手里还攥着电话，老板娘那头还在“喂喂喂”
出了门是巷子，巷子穿出去是菜市场，再出去是老居民楼中间夹着的水泥空地。这片地方下午五点以后就是摊贩收摊的时段，板车横在路口，地上潮。周围猫从墙头看热闹，一动不动。

+ [继续 # choice:dch02_s004_continue]
    -> dch02_s005


=== dch02_s005 ===
# scene:dch02_s005
苏明快追上了。小女孩脚步一停，站在原地，哇地嚎啕大哭，嗓门比他大三倍，冲周围喊：“他追我！这个男的摸我！”摊贩、大妈、路过的两个外卖员，一圈人从四面合了过来。
苏明大声喊：“她偷东西！手机里有监控！”话音刚落，旁边一个卖牛肉的大胖子从摊位后头绕出来，手里还提着一把折叠椅，眼睛红的，嗓门比苏明还大，脚步往他这边冲。

+ [继续 # choice:dch02_s005_continue]
    -> dch02_s006

=== dch02_s006 ===
# scene:dch02_s006
苏明往旁边跳，折叠椅擦着他耳边过去，带起一阵风。他赶紧把手机举起来，边跑边喊：“你看！监控！这是证据！”
人群挪了挪位置，有人探头看了一眼他手机屏幕，开始犹豫。“他说的……好像也挺对……”有人小声说。大胖子停了停，折叠椅还举着，转头看向小女孩：“你真的没被——”
小女孩这时候嚎哭得更大声了，使劲往大妈身边蹭：“大妈大妈，他追我好久了，我好怕……”

+ [继续 # choice:dch02_s006_continue]
    -> dch02_s007

=== dch02_s007 ===
# scene:dch02_s007
大妈把小女孩搂进怀里，给大胖子使了个眼色。大胖子把折叠椅放下来，转身往苏明走过去，一把薅住他的衣领，把他往自己跟前拎了拎，就那么定在那儿，苏明没挣扎，他也知道这会儿挣扎只有死路一条，就那么被摁着，把手机举到大胖子眼前：“我以我妈的名义大胖子低下头，眯起眼睛，往手机屏幕上看了两秒，然后抬起头，把视线对准了小女孩。那边的大妈也跟着看过去。

+ [继续 # choice:dch02_s007_continue]
    -> dch02_s008

=== dch02_s008 ===
# scene:dch02_s008
周围的人也都跟着看过去。小女孩被这么多双眼睛盯着，哭声慢慢停了。她抽了抽鼻子，把眼泪用袖子抹干净，神情一帧一帧切回那种小大人的平静。
她缓缓开口，像是在陈述事实：“你们大人，其实都挺好骗的。”说完，她低头从校服口袋里掏出苏明的手机——不知道什么时候顺走的——两只手捧着，往旁边推车方向一扔，高高的弧线，正砸向摞着的啤酒瓶箱。

+ [继续 # choice:dch02_s008_continue]
    -> dch02_s009

=== dch02_s009 ===
# scene:dch02_s009
苏明反射性就扑了过去。他没注意脚下。大胖子刚才放下的折叠椅就搁在他跟前，椅腿斜着支在地上，椅面朝上。苏明全力往前冲，右有人把他搀起来。鼻血滴在水泥上，脑袋嗡嗡的，视线糊了一下，他咬着牙站稳，捡起手机，把屏幕摁亮——没碎，屏幕是好的他低下头喘了口气，才发现手在抖。
苏明反射性就扑了过去。
有人把他搀起来。

+ [辣条钱我扫了 # choice:d2_pay_self]
    ~ paid_snack = true
    ~ mianzi = mianzi + 3
    -> dch02_s010
+ [再说一遍：我出 # choice:d2_pay_repeat]
    ~ paid_snack = true
    ~ mianzi = mianzi + 5
    -> dch02_s010

=== dch02_s010 ===
# scene:dch02_s010
等他抬起头，小女孩早就不见了。大胖子收起折叠椅，一脸说不清是服气还是不服气的表情，没说话，转身回他摊子后头去了。大妈把抱过小女就苏明一个人站在那儿，鼻血还没止，手机还握着，像刚打输一场没人记得的架。回到超市，老板娘周姐已经听完电话了，嗔了他一眼：“你啊，下次算了，跑不赢小孩的。”常来买烟的张师傅蹲在门口，把这一出全看在了眼里，走的时候拍了拍他肩膀：“小伙子，你这样迟早吃亏。

+ [继续 # choice:dch02_s010_continue]
    -> dch02_s011

=== dch02_s011 ===
# scene:dch02_s011
苏明正想说什么，货架那头绕出来一个人。雷欧，背着包，背着手，一脸等了很久的表情：“走了，看房子。”他扫了一眼苏明脸上的血，眉毛扬了一下：“你怎么了？”“摔了。”苏明捂着鼻子，“没事。”
“走了，看房子。”

+ [继续 # choice:dch02_s011_continue]
    -> dch02_s012

=== dch02_s012 ===
# scene:dch02_s012
雷欧骑的是一辆蓝色小电驴，车把手上绑着一圈快递贴纸，不知道从哪儿撕来的，贴得密密麻麻。苏明坐后座“你怎么租那个地方的？”苏明问。“语言学校宿舍去年到期，”雷欧踩着车，嗓音随引擎声起伏，“有人在语伴群里发，说代管的那个不在乎你“然后呢？”“然后我汉语没进步，”雷欧耸了耸肩，“但我觉得那楼住着干净，就没走。”
“然后呢？”

+ [继续 # choice:dch02_s012_continue]
    -> dch02_s013

=== dch02_s013 ===
# scene:dch02_s013
苏明：“踏实个屁。”“不踏实，但干净。”石家小楼在一条旧巷子里，三层，外皮有些年头了，走近了能看见墙皮翘起的地方，屋里灯光是黄的，从窗缝石佩欣住2F。雷欧带苏明上楼，敲门。里面传出游戏音效——键盘声、鼠标点击声，还有那种组队游戏特有的人声提示音，一局正进行中。
苏明：“踏实个屁。”
“不踏实，但干净。”

+ [先把楼规听完 # choice:d2_pace_a]
    ~ mianzi = mianzi + 3
    -> dch02_s014
+ [只想尽快定下来 # choice:d2_pace_b]
    ~ mianzi = mianzi - 3
    -> dch02_s014

=== dch02_s014 ===
# scene:dch02_s014
雷欧按门铃。没反应。两人站在门口，等。等了大概十分钟，雷欧从背包侧袋摸出两罐啤酒，递给苏明一罐，两人就靠着走廊墙壁坐下来。漆皮已经龟裂聊了几句，里面的游戏音效突然停了。停了大概有三十秒，门才开。
雷欧按门铃。没反应。
两人站在门口，等。

+ [继续 # choice:dch02_s014_continue]
    -> dch02_s015

=== dch02_s015 ===
# scene:dch02_s015
石佩欣出来——睡衣，头发随手扎着，发卡还没拔，露出一截橡皮鸭图案。身后的电脑屏幕上来不及缩的那幅“鼻血没擦干净。”苏明把袖子在脸上抹了一下。“我想住进来，九百的预算。”她目光在他胸前那块超市工牌上停了一秒：“收银的？”
“鼻血没擦干净。”

+ [继续 # choice:dch02_s015_continue]
    -> dch02_s016

=== dch02_s016 ===
# scene:dch02_s016
“对，还兼职别的。”“只要别在我楼里摆摊。”她一点不绕弯子，抽烟？带人过夜？谈过对象没？谁提的分手？问到“谁提的分手”这一句，雷欧从旁边凑过来，热心肠地当起翻译，先把这句话翻成英文给自己过了一遍，“不是扔——”石佩欣一手扶额，嫌弃地看了他一眼，“滚一边去。”雷欧心服口服地退到了楼梯口，小声跟苏明总结经验：“她的问题不用翻译，答案统一是'不敢'。”
“对，还兼职别的。”

+ [分了……我提的 # choice:d2_admit_me]
    ~ admitted_breakup = true
    ~ mianzi = mianzi - 3
    -> dch02_s017
+ [硬着头皮：我提的 # choice:d2_admit_me_hard]
    ~ admitted_breakup = true
    ~ mianzi = mianzi + 3
    ~ ai_score = ai_score - 3
    -> dch02_s017

=== dch02_s017 ===
# scene:dch02_s017
~ clue_rental_receipt = true
“不抽。不带。”苏明顿了顿，硬着头皮往下说，“分了，我提的。”“自己提的更稳。过。”她说完，挥了挥手接着往下——条款连着往外跟：不许带人、别在公共区抽烟、猫的苏明嘴比脑子快，插了一句：“能不能——假设——带女朋友？”“你不是刚分？”“……假设。”
“你不是刚分？”
“……假设。”

{ breakup_delivery == "flat":
    苏明又把那句报快递单似的“分手了。昨天。”搬出来，平得像只要不抖就不算丢人。
}
{ breakup_delivery == "hard":
    苏明下巴一硬：“真实的你要吗？我提的。”嘴还是那把临时搭的架子。
}
{ budget_stance == "firm_900":
    九百块房租像一道硬杠横在账本上；他守住了数字，别的钱就得自己割。
}
{ budget_stance == "unspoken_less":
    那句“能不能再少点”没敢出口，九百照样落了地；没说出的还价，现在从辣条钱里找零。
}

+ [问出口：假设带女朋友？ # choice:d2_ask_guest]
    ~ asked_guest = true
    ~ mianzi = mianzi + 3
    -> dch02_housing_hotspots
+ [话到嘴边又咽回去……还是问了 # choice:d2_swallow_guest]
    ~ asked_guest = true
    ~ mianzi = mianzi - 5
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
看房标注 1/3 · 墙皮。
+ [点开墙皮 # choice:housing_hotspots_q1_wall]
    ~ housing_hotspots_q1 = "wall"
    -> q2
+ [跳过看房热点 # choice:housing_hotspots_q1_skip]
    -> skipped

= q2
# scene:dch02_housing_hotspots
# interaction:housing-hotspots-v1
# interaction-step:2
看房标注 2/3 · 橘猫。
+ [点开橘猫 # choice:housing_hotspots_q2_cat]
    ~ housing_hotspots_q2 = "cat"
    -> q3
+ [跳过看房热点 # choice:housing_hotspots_q2_skip]
    -> skipped

= q3
# scene:dch02_housing_hotspots
# interaction:housing-hotspots-v1
# interaction-step:3
看房标注 3/3 · 楼梯口 / 楼规。
+ [点开楼梯口 # choice:housing_hotspots_q3_stairwell]
    ~ housing_hotspots_q3 = "stairwell"
    ~ housing_hotspots_completed_at_version = "housing-hotspots-v1"
    -> result
+ [跳过看房热点 # choice:housing_hotspots_q3_skip]
    -> skipped

= skipped
~ housing_hotspots_skipped = true
~ housing_hotspots_completed_at_version = "housing-hotspots-v1"
-> result

= result
# scene:dch02_housing_hotspots
{ housing_hotspots_skipped:
    苏明没把每个角都摸一遍。石佩欣当没看见，楼规照旧等着他。
- else:
    墙皮、猫、楼梯口——三个点都在日志里亮了一下，像房东随手盖的审核章。
}

+ [继续 # choice:housing_hotspots_continue]
    -> dch02_s018

=== dch02_s018 ===
# scene:dch02_s018
“假设也不行。”猫这时候从屋里踱出来，跳下门槛，顺道踩了苏明一脚，留下一个灰扑扑的爪印，像是替石佩欣补盖了一道审说着说着，石佩欣突然停下来了。她抬头看了苏明一眼，没说话，转身往屋里走，边走边说：“行，住进来吧，3F-A，我去取钥匙。”门半开半关，人不见了。
“假设也不行。”
门半开半关，人不见了。

+ [继续 # choice:dch02_s018_continue]
    -> dch02_s019

=== dch02_s019 ===
# scene:dch02_s019
雷欧在旁边没动，停了一会儿，很轻地说了一句：“她又开了一局。”游戏音效从门缝里漏出来，一如既往。
当晚苏明就搬进了3F-A。行李是几个垃圾袋，抱进来放到墙边，站在屋子中间看了一圈——房间比想象中大，但墙皮有些翘，床板是旧的。
刚把最后一个袋子拖进来，楼下传来一阵急促的敲门声，一下比一下重。苏明心里咯噔：第一反应是石佩欣反悔了。他手忙脚乱把东西塞回袋子，才去开门。
第一反应是石佩欣反悔了，或者哪条规矩他没听清楚就已经犯了。

+ [继续 # choice:dch02_s019_continue]
    -> dch02_s020

=== dch02_s020 ===
# scene:dch02_s020
门外站着个抱保温杯的大爷，一脸急切：“娃儿，你是不是新搬来的？楼下水表箱钥匙你晓不晓得放哪儿？”苏明愣了两秒，才想起自己确实不知道，也确实不该知道——他今天才第一次踏进这栋楼。他老实回了句“不虚惊一场。苏明关上门，后背的汗才慢慢干下去——租客身份都没坐稳，倒先演练了一遍“东窗事发”是什么三个月以后。苏明住3F-A，两份工换着上，钱紧，但没崩。

+ [继续 # choice:dch02_s020_continue]
    -> dch02_s021

=== dch02_s021 ===
# scene:dch02_s021
石佩欣天天憋在2F，外卖吃了三个月，公共区出没时间固定在深夜，猫王子比她更常见到。雷欧住3F-B某天他从超市回来，走到3F-B门口，里面响着法语——那种激烈的法语，两个人都在说，声音越来越大，苏明在原地站了一会儿，不知道该不该动。过了一会儿，雷欧把门拉开了，看见苏明站在门口，问：“听了多久？”

+ [继续 # choice:dch02_s021_continue]
    -> dch02_s022

=== dch02_s022 ===
# scene:dch02_s022
“不知道。我也没懂。”“她觉得，”雷欧说，停了一下，“那个机器人的事——”他摇了摇头，“算了。”隔了两天，两人都在心动引擎测试楼的等候区等场次。等候区的椅子跟第一次来没什么变化，苏明选了靠墙的一张照片，一个机器人。
“不知道。我也没懂。”
一张照片，一个机器人。

+ [继续 # choice:dch02_s022_continue]
    -> dch02_s023

=== dch02_s023 ===
# scene:dch02_s023
苏明以为是那种钢铁感的、关节明显的那种，看了一眼才发现不是——东亚脸，五官精细，皮肤质感是那种哑“公司新的，”雷欧说，“实体的。抱回家那种。补贴是咱们场次五倍，要独立房间，签保密协议，违约金后苏明盯着照片：“多少钱？”雷欧说了数字。

+ [嗤一声：测那玩意儿的都有病 # choice:d2_dismiss_robot]
    ~ robot_interest = "dismiss"
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 5
    -> dch02_s024
+ [嘴上骂，耳朵却竖起来 # choice:d2_curious_robot]
    ~ robot_interest = "curious"
    ~ ai_score = ai_score + 5
    ~ mianzi = mianzi - 3
    【系统】情感真实度 +5。口头否定与行为兴趣同时捕获——恭喜，您很有样本价值。
    -> dch02_s024

=== dch02_s024 ===
# scene:dch02_s024
苏明把手机推回去：“测那玩意儿的都有病。”“你们中文场不也全天候被听？”雷欧接过手机，耸了耸肩，“一样一样。”苏明被这句话噎住了，没接话。“全天候体验官——”雷欧翻着手机上的短信，“官哦，苏明，你们中国什么都能当官。”

+ [继续 # choice:dch02_s024_continue]
    -> dch02_s025

=== dch02_s025 ===
# scene:dch02_s025
他把手机翻面扣着，不理他。雷欧说，他其实想报名，但女友觉得这是他想用机器人解决性的问题，觉得恶心，觉得他把这当性玩具看了。雷欧看着他：“你说的挺准。”苏明：“我有一点经验。”

+ [继续 # choice:dch02_s025_continue]
    -> dch02_s026

=== dch02_s026 ===
# scene:dch02_s026
他把话题关了，不想多说。当天晚上，苏明一个人坐在3F-A，手机震了一下——他爸：钱到没有？腰又开始痛了，医生说要买个护腰。
苏明回了“到了，最近忙”其实还没转，得先紧着房租周转。他把这条消息看了两遍，扣在床边，没再回什么。
又点开大学室友的对话框，想找个人说说话。最后一条是三个月前的婚礼电子请柬。输入半句，又删掉，锁了屏。

+ [继续 # choice:dch02_s026_continue]
    -> dch02_s027

=== dch02_s027 ===
# scene:dch02_s027
他划开手机上的交友软件消磨时间：一个简介写着“社恐找懂我的人”，全程用表情包代替说话；一个直接甩过来收款码，附言“验证真心”；再划一个，配图是只瞪圆眼的暹罗猫。
划掉这些软件的时候，他的手指鬼使神差地点开了雷欧转发的那条招募链接。落地页第一行字迎面撞过来：“她不会评判你，只会理解你。”
苏明一眼就认出了这句话。App 里那个 AI，开口没两句就是这一句。同一家公司，同一套话术，他连字体都认得清清楚楚。

+ [继续 # choice:dch02_s027_continue]
    -> dch02_s028

=== dch02_s028 ===
# scene:dch02_s028
~ clue_nda = true
页面再往下滑，是体验官评价区。五星那条底下写着：“自从有了她，我再也不用假装很好。”点赞八百多个。苏明点了“有用”，点完才发现，这比报名更丢脸。
报名问卷要上传居住环境照片，要求包含公共区域，要求“照片内不得出现他人面孔”提交前弹出一份保密承诺，第七条加了粗：设备之存在，不得让任何非签约人知晓，包括同住人。
他终究还是点了那个“申请成为体验官”的按钮。
苏明架好手机，对着3F的走廊和公共区域准备拍，举起来刚要按。

{ robot_interest == "dismiss":
    他嘴里那句“都有病”还没过保质期，拇指已经替它办理了退货。
}
{ robot_interest == "curious":
    耳朵先前竖起来的那一下没白费；落地页刚开，他就知道自己会看到底。
}
{ memory_posture == "shame":
    交友软件刚亮，他的掌心先贴上脸，像昨晚那段记忆又来收一次遮羞费。
}
{ memory_posture == "hard":
    交友软件刚亮，他把下巴咬紧，继续往下划；硬撑这门手艺，平台之间倒是通用。
}

+ [点下申请成为体验官 # choice:d2_apply]
    ~ applied_robot = true
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 5
    【系统】情感真实度 +8。体验官申请已受理。隐私会好好保管——在「好好」的定义范围内。
    -> dch02_mobile_questionnaire
+ [骂自己一句再点申请 # choice:d2_apply_shame]
    ~ applied_robot = true
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 8
    【系统】情感真实度 +8。自厌独白可提升样本可信度。请继续对自己诚实，对公司更诚实。
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
# scene:dch02_mobile_questionnaire
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
    【系统】情感真实度 +5。您对高度拟人「不介意」。此选项在后台显示为绿灯。
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
# scene:dch02_mobile_questionnaire
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
# scene:dch02_mobile_questionnaire
{ mobile_questionnaire_skipped:
    问卷页缩成一条“稍后再填”保密承诺第七条仍加着粗。
- else:
    三道题交完，提交钮还在下一屏等他。苏明把手机屏幕亮度又调暗了一格。
}

+ [继续 # choice:mobile_questionnaire_continue]
    -> dch02_s029

=== dch02_s029 ===
# scene:dch02_s029
公共走廊的路由器就在3F楼梯口旁边，苏明知道这个。石佩欣今晚游戏掉线，要上来重启。他赶紧把手机藏到背后。石佩欣走过去按了重启键，等指示灯变绿，转身下楼，经过苏明身边，看了他一眼，没说话，走了。苏明等她下楼，重新举起手机。

+ [继续 # choice:dch02_s029_continue]
    -> dch02_s030

=== dch02_s030 ===
# scene:dch02_s030
五分钟后，楼梯口又有声音。石佩欣又上来了——路由器重启完了要拔一下电源确认，确认完重新插上。她照旧经过苏明，照旧什么都没说，下楼。苏明又把手机藏了。
这来来回回折腾了三次。到最后苏明只找到房间那个唯一不掉墙皮的角落，拍了个勉强过得去的照片；公共区那张，他把手机斜了四十五度，把路由器框进去大半，画面里一半是天花板。他想了想，上传了。

+ [继续 # choice:dch02_s030_continue]
    -> dch02_s031

=== dch02_s031 ===
# scene:dch02_s031
问卷：邻居容忍度自评——他先填了“一般”，盯着屏幕看了两秒，改成了“良好”“您是否介意设备高度拟人”——他盯着这道题想了半天，介意的反义词到底是什么来着？
提交前那份保密承诺第七条还在加粗：设备之存在，不得让任何非签约人知晓，包括同住人。苏明想起这楼里住着三个活人，还有一只猫，手指在屏幕上悬了悬，最终还是勾选了“已阅读并同意”

+ [继续 # choice:dch02_s031_continue]
    -> dch02_s032


=== dch02_s032 ===
# scene:dch02_s032
~ clue_pass_sms = true
深夜十一点四十分，他按下了提交。三分钟后，短信回来了：“初审通过。请于48小时内完成个性化匹配问卷。”回得这么快，快得像是那头有人专门在等着他似的。苏明盯着这条短信看了半分钟，喃喃说了句：“就当我有病。”

{ robot_interest == "dismiss":
    嘴硬的账终于对上了：先骂体验官有病，再把自己送进初审。流程闭环。
}
{ robot_interest == "curious":
    他早把好奇藏在骂声后头；短信一亮，那个藏法正式失效。
}
{ frontdesk_response == "calculate":
    白天工资、晚上补贴又在脑子里排队；前台那次火气输给计算器，现在计算器成了排班表。
}
{ frontdesk_response == "angry":
    他手腕扫得更快，像还在跟那张前台笑脸顶嘴；可两份工一班没少，火气照样得打卡。
}
前台那次还在：现在计算器成了排班表，火气照样得打卡，两种输法他都试过。


+ [继续 # choice:dch02_s032_continue]
    -> d2_chapter_end

=== d2_chapter_end ===
# scene:d2_chapter_end
短信屏幕还亮着。
+ [接受初审结果 # choice:d2_accept_crazy]
    -> END

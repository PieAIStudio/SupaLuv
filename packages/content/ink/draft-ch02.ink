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

{ mianzi >= 70:
    周姐路过收银台时多看了他一眼：“你今天腰杆倒挺直。别以为像干部就不用卸货。”
    苏明把工牌扶正，像把体面别回胸前。
    她走远后他还保持站姿半秒，才想起货还堆着。
}
{ mianzi < 30:
    周姐把一袋临期面包搁他手边：“拿着。你这脸色，顾客看了以为店要倒闭。”
    他想拒，手指已经扣住了袋口。
    面包袋子上印着半价标签，像一张不体面的勋章。
}
{ ai_score >= 70:
    手机又震：体验官等级提示「配合度优」。白天扫辣条，晚上还被系统扫绩效。
    他甚至怀疑系统知道他哪一秒抬腕最标准。
}
{ ai_score < 30:
    手机锁屏上压着一条灰字催办：波动分偏低，建议复测。他划掉，像划掉一笔债。
    可角标还在，红点不灭，比老板娘的催促更黏。
}

苏明站在收银台后头，视线已经跟了那孩子有一阵了。她在辣条货架前假装比口味——翻一包看看背面，再拿另一包翻翻，动作悠闲，眼神却没往柜台这边飘过一下。校服袖口挽了两道，辣条就在这档口塞进去了，一塞就是两包，动作熟练得跟扫码差不多。第三次了。苏明认得这件校服的颜色。
他在这家叫“惠万家”的小超市干了快半年了——门脸两米宽，货架挤得侧身才能过，店名听着气派，实际能惠及的范围也就方圆三百米。这种店有两怕：被大超市抢生意，被小孩顺手牵羊。前一件他管不了，后一件他较真。
他绕出收银台，走过去，把平板转过来给她看。监控画面停在那儿，时间戳清清楚楚。

+ [继续 # choice:dch02_s001_continue]
    -> dch02_s002

=== dch02_s002 ===
# scene:dch02_s002
“这是你第三次了。”
小女孩先不说话。她抬起头看他，神情平静得不像这个年纪——不像是被抓住的人，更像是坐在谈判桌对面的人，就这么安安静静地盯着他，等他继续说。
两个人沉默了大概有四五秒。然后她开口了。
“我是不是……太冷静了？”

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
    苏明把扫描枪放回支架，像放弃一场不会涨工资的模拟赛。
- else:
    三声“嘀”叠在一起。苏明手腕还记得节奏：白天扫条码，晚上被 App 扫灵魂。
    临期辣条、冰红茶、桶装方便面——每扫一声，像给自己的耐心打卡。
    练习模式关掉时他甚至有点失落：至少这里，完成度还能看得见绿灯。
    他把扫描枪擦了一下感应窗，动作认真得像在给系统交作业。
    货架灯管嗡嗡响，他脑子里却闪过补贴档位表那一栏“完成度”。
    有用。完成度。这两个词从超市穿到测试楼，中间只隔一场夜班。
    周姐以为他在发呆：“发什么愣？下一单！”
    苏明应了一声，腕子却还留着三下“嘀”的肌肉记忆。
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
    他听见自己说“拿出来”的尾音，硬得像超市广播。
}
她回看他，眼神又变回了那种平静的。

{ child_response == "soft":
    苏明先松开手，声音却没退：“拿出来。”克制不是撤单，只是不给围观的人加戏。
    他尽量把音量压在货架高度以下，像怕惊动监控以外的人。
}
那颗心回来以后，他做了个决定：叫老板娘出来处理。他掏出手机拨号，电话接通，“喂”字刚出口——小女孩从他旁边走过来，两只小手捂住他握手机的那只手，摁着不让他动。等他想明白，小女孩已经松手开跑了。苏明追出去，手里还攥着电话，老板娘那头还在“喂喂喂”。
出了门是巷子，巷子穿出去是菜市场，再出去是老居民楼中间夹着的水泥空地。这片地方下午五点以后就是摊贩收摊的时段，板车横在路口，地上潮，前两天下过雨，没干透。苏明个子高，绕不过板车把手，小女孩从车轮底下钻出去。周围猫从墙头看热闹，一动不动。

+ [继续 # choice:dch02_s004_continue]
    -> dch02_s005


=== dch02_s005 ===
# scene:dch02_s005
苏明快追上了。小女孩脚步一停，站在原地，哇地嚎啕大哭，嗓门比他大三倍，冲周围喊：“他追我！这个男的摸我！”摊贩、大妈、路过的两个外卖员，一圈人从四面合了过来。
苏明大声喊：“她偷东西！手机里有监控！”话音刚落，旁边一个卖牛肉的大胖子从摊位后头绕出来，手里还提着一把折叠椅，眼睛红的，嗓门比苏明还大，脚步往他这边冲：“操你妈的，欺负小孩！”

+ [继续 # choice:dch02_s005_continue]
    -> dch02_s006

=== dch02_s006 ===
# scene:dch02_s006
苏明往旁边跳，折叠椅擦着他耳边过去，带起一阵风。他赶紧把手机举起来，屏幕上调出监控画面，边跑边喊：“你看！监控！这是证据！看！”
人群挪了挪位置，有人探头看了一眼他手机屏幕，往小女孩那边看了一眼，又往苏明这边看，开始犹豫。“他说的……好像也挺对……”有人小声说了一句。大胖子停了停，折叠椅还举着，转头看向小女孩：“你真的没被——”
小女孩这时候嚎哭得更大声了，两行眼泪哗哗的，使劲往大妈身边蹭：“大妈大妈，他追我好久了，我好怕……”

+ [继续 # choice:dch02_s006_continue]
    -> dch02_s007

=== dch02_s007 ===
# scene:dch02_s007
大妈把小女孩搂进怀里，给大胖子使了个眼色。大胖子把折叠椅放下来，转身往苏明走过去，一把薅住他的衣领，把他往自己跟前拎了拎，就那么定在那儿，也没动手，就是把他摁住了，重重地问了一句：“你别他妈的哄我，你那监控是真的？”
苏明没挣扎，他也知道这会儿挣扎只有死路一条，就那么被摁着，把手机举到大胖子眼前：“我以我妈的名义发誓，她偷我们超市三回了，那是监控截图，时间戳都有，她是今天三点二十七分拿的，你数数，那一排货有没有辣条。”
大胖子低下头，眯起眼睛，往手机屏幕上看了两秒，然后抬起头，把视线对准了小女孩。那边的大妈也跟着看过去。

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
苏明反射性就扑了过去。
他没注意脚下。大胖子刚才放下的折叠椅就搁在他跟前，椅腿斜着支在地上，椅面朝上。苏明全力往前冲，右膝直接撞上了椅面，整个人往前飞扑出去，手机砸到啤酒箱上弹了一下，没摔坏，他扑到地上，脸正好朝地，下巴先着地，鼻子紧跟着。
有人把他搀起来。
鼻血滴在水泥上，脑袋嗡嗡的，视线糊了一下，他咬着牙站稳，捡起手机，把屏幕摁亮——没碎，屏幕是好的。
他低下头喘了口气，才发现手在抖。

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
等他抬起头，小女孩早就不见了。大胖子收起折叠椅，一脸说不清是服气还是不服气的表情，没说话，转身回他摊子后头去了。大妈把抱过小女孩的手在裤腿上抹了抹，也散了。围观的人慢慢散开，像什么都没发生过。
就苏明一个人站在那儿，鼻血还没止，手机还握着，像刚打输一场没人记得的架。
回到超市，老板娘周姐已经听完电话了，嗔了他一眼：“你啊，下次算了，跑不赢小孩的。”常来买烟的张师傅蹲在门口，把这一出全看在了眼里，走的时候拍了拍他肩膀：“小伙子，你这样迟早吃亏。”顿了顿，又补上一句，“不过我看你顺眼。”拎着烟就走了，也没说这“顺眼”两个字顺在哪儿。

{ paid_snack:
    周姐又补了一刀：“辣条钱你自己扫了？你是超市员工还是慈善基金会？”
    苏明想回嘴，鼻血先回了一滴。
}
{ mianzi < 30:
    张师傅临走丢下一句：“我看你最近气色差，像被什么系统吸干了。别硬装爷们。”
}
{ mianzi >= 70:
    周姐反而收敛了玩笑：“行了，你今天这脾气倒挺像能镇场的。货别堆门口。”
}

+ [继续 # choice:dch02_s010_continue]
    -> dch02_s011

=== dch02_s011 ===
# scene:dch02_s011
苏明正想说什么，货架那头绕出来一个人。雷欧，背着包，背着手，一脸等了很久的表情：“走了，看房子。”
他扫了一眼苏明脸上的血，眉毛扬了一下：“你怎么了？”
“摔了。”苏明捂着鼻子，“没事。”

+ [继续 # choice:dch02_s011_continue]
    -> dch02_s012

=== dch02_s012 ===
# scene:dch02_s012
雷欧骑的是一辆蓝色小电驴，车把手上绑着一圈快递贴纸，不知道从哪儿撕来的，贴得密密麻麻。苏明坐后座，穿过街道，傍晚的光把两侧楼缝染成橘色，远处有人在炒菜，油烟飘过来。
“你怎么租那个地方的？”苏明问。
“语言学校宿舍去年到期，”雷欧踩着车，嗓音随引擎声起伏，“有人在语伴群里发，说代管的那个不在乎你哪国人，但不喜欢抽烟。我当时合同里有一条，每月要有汉语进步，住跟中国人同楼是加分的，我就去了。”他停了一下，“住进去才发现，那个石小姐，每天能听见的中文不超过十个字。”
“然后呢？”
“然后我汉语没进步，”雷欧耸了耸肩，“但我觉得那楼住着干净，就没走。”

+ [继续 # choice:dch02_s012_continue]
    -> dch02_s013

=== dch02_s013 ===
# scene:dch02_s013
苏明：“踏实个屁。”
“不踏实，但干净。”
石家小楼在一条旧巷子里，三层，外皮有些年头了，走近了能看见墙皮翘起的地方，屋里灯光是黄的，从窗缝里漏出来。
石佩欣住2F。雷欧带苏明上楼，敲门。里面传出游戏音效——键盘声、鼠标点击声，还有那种组队游戏特有的人声提示音，一局正进行中。

+ [先把楼规听完 # choice:d2_pace_a]
    ~ mianzi = mianzi + 3
    -> dch02_s014
+ [只想尽快定下来 # choice:d2_pace_b]
    ~ mianzi = mianzi - 3
    -> dch02_s014

=== dch02_s014 ===
# scene:dch02_s014
雷欧按门铃。没反应。两人站在门口，等。等了大概十分钟，雷欧从背包侧袋摸出两罐啤酒，递给苏明一罐，两人就靠着走廊墙壁坐下来。漆皮已经龟裂了一大块，雷欧用手抠了一下，砌砖的纹路还清晰。苏明捂着鼻子喝了口啤酒，凉的，鼻腔还在疼。
聊了几句，里面的游戏音效突然停了。停了大概有三十秒，门才开。

+ [继续 # choice:dch02_s014_continue]
    -> dch02_s015

=== dch02_s015 ===
# scene:dch02_s015
石佩欣出来——睡衣，头发随手扎着，发卡还没拔，露出一截橡皮鸭图案。身后的电脑屏幕上来不及缩的那幅图，被她眼疾手快地点掉了，苏明只来得及瞥见一片肉色，什么都没看清楚。她表情是那种“打完了，哦，你们还在”的平静，看了苏明一眼：“鼻血没擦干净。”
苏明把袖子在脸上抹了一下。“我想住进来，九百的预算。”
她目光在他胸前那块超市工牌上停了一秒：“收银的？”

{ mianzi < 30:
    石佩欣把发卡往上推了推，语气忽然像房东劝退：“九百？你这状态看着不像能稳交三个月。楼里不收‘快撑不住的人’。”
    她甚至抬下巴示意楼梯：“雷欧介绍来的也不行。你要是交不起，别把我卷进催租短信。”
}
{ mianzi >= 70:
    她上下打量他，像在确认是不是来投诉的：“你这架势……我还以为物业派来查违建的。”
    雷欧在楼梯口小声翻译给自己听：“查违建？那是夸你像领导。”苏明没接话，只觉得这夸奖比降权还刺。
}

+ [继续 # choice:dch02_s015_continue]
    -> dch02_s016

=== dch02_s016 ===
# scene:dch02_s016
“对，还兼职别的。”
“只要别在我楼里摆摊。”她一点不绕弯子，抽烟？带人过夜？谈过对象没？谁提的分手？
问到“谁提的分手”这一句，雷欧从旁边凑过来，热心肠地当起翻译，先把这句话翻成英文给自己过了一遍，再翻回中文转述给苏明：“她问，谁把谁扔掉了。”
“不是扔——”石佩欣一手扶额，嫌弃地看了他一眼，“滚一边去。”
雷欧心服口服地退到了楼梯口，小声跟苏明总结经验：“她的问题不用翻译，答案统一是'不敢'。”

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
“不抽。不带。”苏明顿了顿，硬着头皮往下说，“分了，我提的。”
“自己提的更稳。过。”她说完，挥了挥手接着往下——条款连着往外跟：不许带人、别在公共区抽烟、猫的食物不要动、锅铲不许当武器，上一任租客拿它敲墙试隔音，把锅铲敲弯了。

{ breakup_delivery == "flat":
    苏明又把那句报快递单似的“分手了。昨天。”搬出来，平得像只要不抖就不算丢人。
}

{ admitted_breakup:
    石佩欣“哦”了一声，像在表格里勾选：主动分手，风险较低。
}
{ asked_guest:
    她把“女朋友”三个字在舌尖滚了一圈，笑得不怀好意：“假设也要写进楼规附录。”
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
    苏明嘴比脑子快，插了一句：“能不能——假设——带女朋友？”
    -> dch02_housing_hotspots
+ [话到嘴边又咽回去……还是问了 # choice:d2_swallow_guest]
    ~ asked_guest = true
    ~ mianzi = mianzi - 5
    苏明嘴比脑子快，插了一句：“能不能——假设——带女朋友？”
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
    看房热点清单被他划掉。石佩欣的楼，有些角落他宁可当不存在。
    雷欧在楼梯口打了个哈欠：“你不点，我也懒得当导游。”
- else:
    墙皮、橘猫、楼梯口——三点连成线，像给这栋楼做了一次廉价体检。
    苏明把截图存进相册，文件名随手写成“别让她知道我拍过”。
}


+ [继续 # choice:housing_hotspots_continue]
    -> dch02_s018

=== dch02_s018 ===
# scene:dch02_s018
“你不是刚分？”
“……假设。”
“假设也不行。”
猫这时候从屋里踱出来，跳下门槛，顺道踩了苏明一脚，留下一个灰扑扑的爪印，像是替石佩欣补盖了一道审核章。
说着说着，石佩欣突然停下来了。她抬头看了苏明一眼，没说话，转身往屋里走，边走边说：“行，住进来吧，3F-A，我去取钥匙。”
门半开半关，人不见了。

{ asked_guest:
    雷欧在楼梯口憋笑：“你刚才那句假设，她会记三年。比合同还长。”
}
{ not asked_guest:
    雷欧拍拍他肩：“聪明，别问多余的。楼规越短越好背。”
}

+ [继续 # choice:dch02_s018_continue]
    -> dch02_s019

=== dch02_s019 ===
# scene:dch02_s019
雷欧在旁边没动，停了一会儿，很轻地说了一句：“她又开了一局。”游戏音效从门缝里漏出来，一如既往。
当晚苏明就搬进了3F-A。行李是几个垃圾袋，抱进来放到墙边，站在屋子中间看了一圈——房间比想象中大，但墙皮有些翘，床板是旧的，窗户关上还能听见巷子里卖菜的声音。
刚把最后一个袋子拖进来，楼下传来一阵急促的敲门声，一下比一下重。苏明心里咯噔：第一反应是石佩欣反悔了，或者哪条规矩他没听清楚就已经犯了。他手忙脚乱把东西塞回袋子，才去开门。

+ [继续 # choice:dch02_s019_continue]
    -> dch02_s020

=== dch02_s020 ===
# scene:dch02_s020
门外站着个抱保温杯的大爷，一脸急切：“娃儿，你是不是新搬来的？楼下水表箱钥匙你晓不晓得放哪儿？”苏明愣了两秒，才想起自己确实不知道，也确实不该知道——他今天才第一次踏进这栋楼。他老实回了句“不晓得”，大爷叹口气，骂骂咧咧地下楼去找别人问了。
虚惊一场。苏明关上门，后背的汗才慢慢干下去——租客身份都没坐稳，倒先演练了一遍“东窗事发”是什么心情。
三个月以后。苏明住3F-A，两份工换着上，钱紧，但没崩。

+ [继续 # choice:dch02_s020_continue]
    -> dch02_s021

=== dch02_s021 ===
# scene:dch02_s021
石佩欣天天憋在2F，外卖吃了三个月，公共区出没时间固定在深夜，猫王子比她更常见到。雷欧住3F-B，这学期换了三个女友，现在是法国来的金发女生，在重庆读交流项目，总在楼道里用法语打电话。
某天他从超市回来，走到3F-B门口，里面响着法语——那种激烈的法语，两个人都在说，声音越来越大。有人砰一声关了什么，走廊里响起高跟鞋声。金发女友出来，眼眶红的，没看苏明，直接下楼了。苏明在原地站了一会儿，不知道该不该动。过了一会儿，雷欧把门拉开了，看见苏明站在门口，问：“听了多久？”

+ [继续 # choice:dch02_s021_continue]
    -> dch02_s022

=== dch02_s022 ===
# scene:dch02_s022
“不知道。我也没懂。”
“她觉得，”雷欧说，停了一下，“那个机器人的事——”他摇了摇头，“算了。”
隔了两天，两人都在心动引擎测试楼的等候区等场次。等候区的椅子跟第一次来没什么变化，苏明选了靠墙的一排坐下，雷欧在旁边掏出手机，把屏幕转过来给他看。
一张照片，一个机器人。

+ [继续 # choice:dch02_s022_continue]
    -> dch02_s023

=== dch02_s023 ===
# scene:dch02_s023
苏明以为是那种钢铁感的、关节明显的那种，看了一眼才发现不是——东亚脸，五官精细，皮肤质感是那种哑光的白，眼睛是半闭着的，站在那里，姿势是那种很自然的站立，不像机器人应该有的样子，更像是某个很漂亮的人站着。
“公司新的，”雷欧说，“实体的。抱回家那种。补贴是咱们场次五倍，要独立房间，签保密协议，违约金后面五个零，测个东西比我签证材料还多。”
苏明盯着照片：“多少钱？”
雷欧说了数字。

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

{ ai_score >= 70:
    雷欧凑近屏幕看了他一眼，忽然压低声音：“你后台分挺高吧？短信语气都不一样，像在跟老客户说话。”
    他还比了个拇指：“全天候体验官——优待通道。我申请三次才到你现在这种措辞。”
}
{ ai_score < 30:
    雷欧晃了晃自己的手机：“我这条还是催办：补测、降权、限期。你要是也收到这种，就别嘴硬了。”
    他把屏幕翻过来给苏明看红字：观察档体验官不享受五倍补贴。像一份侮辱礼盒。
}

+ [继续 # choice:dch02_s024_continue]
    -> dch02_s025

=== dch02_s025 ===
# scene:dch02_s025
他把手机翻面扣着，不理他。雷欧说，他其实想报名，但女友觉得这是他想用机器人解决性的问题，觉得恶心，觉得他把这当性玩具看了。苏明想了一下，说：“女的对这个……跟男的划线不一样。男的觉得一个物件就是物件，女的觉得这行为在说明你这个人。”
雷欧看着他：“你说的挺准。”
苏明：“我有一点经验。”

{ robot_interest == "dismiss":
    苏明还想补一句“都有病”，话到嘴边变成干笑。雷欧听懂了这笑里的撤退令。
}
{ robot_interest == "curious":
    苏明的目光还黏在那张东亚脸上，像已经在想象开箱。雷欧眨眨眼：“你耳朵竖起来的声音我都听见了。”
}

+ [继续 # choice:dch02_s025_continue]
    -> dch02_s026

=== dch02_s026 ===
# scene:dch02_s026
他把话题关了，不想多说。当天晚上，苏明一个人坐在3F-A，手机震了一下——他爸：钱到没有？腰又开始痛了，医生说要买个护腰。
苏明回了“到了，最近忙”。其实还没转，得先紧着房租周转。他把这条消息看了两遍，扣在床边，没再回什么。
又点开大学室友的对话框，想找个人说说话。最后一条是三个月前的婚礼电子请柬。输入半句，又删掉，锁了屏。

+ [继续 # choice:dch02_s026_continue]
    -> dch02_s027

=== dch02_s027 ===
# scene:dch02_s027
他划开手机上的交友软件消磨时间：一个简介写着“社恐找懂我的人”，全程用表情包代替说话；一个直接甩过来收款码，附言“验证真心”；再划一个，配图是只瞪圆眼的暹罗猫。
划掉这些软件的时候，他的手指鬼使神差地点开了雷欧转发的那条招募链接。落地页第一行字迎面撞过来：“她不会评判你，只会理解你。”
苏明一眼就认出了这句话。App 里那个 AI，开口没两句就是这一句。同一家公司，同一套话术，他连字体都认得清清楚楚。心里明镜似的，知道这是套路——手指却怎么也没停下来。

+ [继续 # choice:dch02_s027_continue]
    -> dch02_s028

=== dch02_s028 ===
# scene:dch02_s028
~ clue_nda = true
页面再往下滑，是体验官评价区。五星那条底下写着：“自从有了她，我再也不用假装很好。”点赞八百多个。苏明盯着这一句看了很久，鬼使神差地点了个“有用”——点完才发现，这个动作比报名本身还叫人丢脸。
报名问卷要上传居住环境照片，要求包含公共区域，要求“照片内不得出现他人面孔”。提交前弹出一份保密承诺，第七条加了粗：设备之存在，不得让任何非签约人知晓，包括同住人。
苏明架好手机，对着3F的走廊和公共区域准备拍，举起来刚要按。
「申请成为体验官」的按钮还停在屏幕下沿，拇指悬着——按下才算数，悬着只是丢脸的预演。

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
    他终究还是点了那个“申请成为体验官”的按钮。
    【系统】情感真实度 +8。体验官申请已受理。隐私会好好保管——在「好好」的定义范围内。
    -> dch02_mobile_questionnaire
+ [骂自己一句再点申请 # choice:d2_apply_shame]
    ~ applied_robot = true
    ~ ai_score = ai_score + 8
    ~ mianzi = mianzi - 8
    他终究还是点了那个“申请成为体验官”的按钮。
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
    问卷页缩成一条“稍后再填”。保密承诺第七条仍加着粗。
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
问卷：邻居容忍度自评——他先填了“一般”，盯着屏幕看了两秒，改成了“良好”。“您是否介意设备高度拟人”——他盯着这道题想了半天，介意的反义词到底是什么来着？
提交前那份保密承诺第七条还在加粗：设备之存在，不得让任何非签约人知晓，包括同住人。苏明想起这楼里住着三个活人，还有一只猫，手指在屏幕上悬了悬，最终还是勾选了“已阅读并同意”。

+ [继续 # choice:dch02_s031_continue]
    -> dch02_s032


=== dch02_s032 ===
# scene:dch02_s032
~ clue_pass_sms = true
深夜十一点四十分，他按下了提交。三分钟后，短信回来了：“初审通过。请于48小时内完成个性化匹配问卷。”回得这么快，快得像是那头有人专门在等着他似的。苏明盯着这条短信看了半分钟，喃喃说了句：“就当我有病。”

{ ai_score >= 70:
    附言多了一行：优先通道已开启。像是有人在后台替他按了加速键——体贴得令人发毛。
    连签名页的字体都换了圆润一号，仿佛公司在对他微笑。
}
{ ai_score < 30:
    十分钟后又弹一条：波动分偏低，初审通过但不享受补贴加成。请于24小时内完成补强问卷。
    末尾还挂着冷冰冰的工单号，像提醒他：你只是勉强过线的样本。
}

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
// ADR-0007: 转正评估结算（递进：初见 → 转正，互斥分支保证必播一条）
{ ai_score >= 70 && mianzi < 30:
    【系统·阶段结算】转正评估：系统端已将您标为「高配合、低体面」优质样本。人间侧的脸面缺口，将作为下一阶段的激励杠杆。
- else:
    { mianzi >= 70 && ai_score < 30:
        【系统·阶段结算】转正评估：您很会在邻居和前台前站直。系统侧备注：站直不等于配合，转正通道保持观察。
    - else:
        { ai_score >= 70:
            【系统·阶段结算】转正评估：情感真实度达标，初审加速已写入档案。温馨提示：加速不等于升职，只等于更快被看见。
        - else:
            { mianzi < 30:
                【系统·阶段结算】转正评估：体面余额持续透支。楼宇与系统均已收到同步——一方在劝退租，一方在劝你多交心。
            - else:
                【系统·阶段结算】转正评估：数据平稳得像便利店临期价签。您既未翻红，也未发光。继续打卡。
            }
        }
    }
}
短信屏幕还亮着。
+ [接受初审结果 # choice:d2_accept_crazy]
    -> END

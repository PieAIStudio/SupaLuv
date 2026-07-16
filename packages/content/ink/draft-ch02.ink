// 第二章 她不会评判你 — densified from draft02.md; Ink is sole topology SSOT.
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
第二章 她不会评判你
"今晚看不成了，明天傍晚。"石佩欣在电话里说，声音底下全是敲键盘的哒哒声，理由是赶稿。

看房被推到第二天。石佩欣挑租客比甲方挑图还细；肯重新约时间，已经算初审通过。

+ [继续 # choice:dch02_s001_continue]
    -> dch02_s002

=== dch02_s002 ===
# scene:dch02_s002
苏明当晚在快捷酒店将就了一宿，一百六一晚，躺在陌生的床上翻来覆去，心疼得半宿没睡踏实。

第二天他照常上日班。超市开在城中村巷口，门脸两米宽，货架挤得人得侧身走。店名叫“惠万家”，服务半径大约三百米。

+ [继续 # choice:dch02_s002_continue]
    -> dch02_s003

=== dch02_s003 ===
# scene:dch02_s003
这份工是他靠一分钟扫四十件抢来的。老板娘姓周，说话难听，心不算硬；工资不高，时间够弹，正好接上晚上的测试班——白天扫条码，晚上被 App 扫灵魂。

{ frontdesk_response == "calculate":
    白天工资、晚上补贴、酒店一百六又在脑子里排队；前台那次火气输给计算器，现在计算器成了排班表。
}
{ frontdesk_response == "angry":
    他手腕扫得更快，像还在跟那张前台笑脸顶嘴；可两份工一班没少，火气照样得打卡。
}

在店里，他会分真穷和装穷：前者只拿临期货，眼睛躲人；后者砍价嗓门最大。他对前一种人心软，老板娘骂了八回也没改。大超市管不了，小偷他一定管。

+ [继续 # choice:dch02_s003_continue]
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
    -> dch02_s004

=== dch02_s004 ===
# scene:dch02_s004
这天，他就撞上了后一件事。

辣条被塞进那件洗得发白、袖口挽了两道的校服口袋里，一塞就是两包，那个动作熟练得跟扫码差不多，一气呵成，连眼神都没往柜台这边飘一下。

+ [继续 # choice:dch02_s004_continue]
    -> dch02_s005

=== dch02_s005 ===
# scene:dch02_s005
苏明从收银台后头绕出来，一把按住那孩子的手腕："拿出来。"

+ [按住手腕：拿出来 # choice:d2_catch_firm]
    ~ child_response = "firm"
    ~ dignity = dignity + 2
    -> dch02_s006
+ [声音放轻一点，还是要拿出来 # choice:d2_catch_soft]
    ~ child_response = "soft"
    ~ dignity = dignity + 1
    -> dch02_s006

=== dch02_s006 ===
# scene:dch02_s006
{ child_response == "firm":
    苏明松开手时，掌心还留着按下去的力道；规矩办完了，围观的人才刚进场。
}
{ child_response == "soft":
    苏明先松开手，声音却没退：“拿出来。”克制不是撤单，只是不给围观的人加戏。
}

小孩"哇"地一声就哭了出来——这哭声比动作还快，明显是训练有素，一套流程走得炉火纯青。母亲从货架后头杀出来，两只手在围裙上蹭了蹭——那双手粗糙得不像是闲人的手，一把把儿子护在身后，嗓门先拔高了三度："你干嘛吓孩子？血口喷人！"

"监控在那儿。"苏明抬手指了指天花板一角。

+ [继续 # choice:dch02_s006_continue]
    -> dch02_s007

=== dch02_s007 ===
# scene:dch02_s007
"那也是你逼的！他手滑！"

围观的顾客都停下脚步看热闹，谁也不出声，就那么站着看戏。老板娘从里屋出来打圆场："小苏啊，算了算了——"

+ [继续 # choice:dch02_s007_continue]
    -> dch02_s008

=== dch02_s008 ===
# scene:dch02_s008
{ budget_stance == "firm_900":
    九百块房租像一道硬杠横在账本上；他守住了数字，别的钱就得自己割。
}
{ budget_stance == "unspoken_less":
    那句“能不能再少点”没敢出口，九百照样落了地；没说出的还价，现在从辣条钱里找零。
}

"辣条钱我扫了。"苏明没搭理老板娘的劝，转身回到收银台，自己给那包辣条刷了单，小票"啪"地拍在柜台上，"下次别带他来偷。"

+ [辣条钱我扫了 # choice:d2_pay_self]
    ~ paid_snack = true
    -> dch02_s009
+ [再说一遍：我出 # choice:d2_pay_repeat]
    ~ paid_snack = true
    ~ dignity = dignity + 1
    -> dch02_s009

=== dch02_s009 ===
# scene:dch02_s009
那母亲骂骂咧咧地拽着孩子往外走，临出门还啐了一句："小小收银的，狗眼看人低。"

老板娘叹了口气，问要不要把这钱从他工资里扣。

+ [继续 # choice:dch02_s009_continue]
    -> dch02_s010

=== dch02_s010 ===
# scene:dch02_s010
"我出。"他说第二遍时，脸绷得像在替两包辣条签担保。

常来买烟的张师傅看完全程，走时拍他肩膀："小伙子，你这样迟早吃亏。"顿了顿，又补一句，"不过我看你顺眼。"拎着烟走了，没解释顺在哪儿。

+ [继续 # choice:dch02_s010_continue]
    -> dch02_s011

=== dch02_s011 ===
# scene:dch02_s011
傍晚，看房的时间到了。

雷欧提前一步蹲在楼梯口给他当监工，见他人到了，老远就伸手招呼："你来了。石姐——很凶，Very。"这几个字他说得又急又慢，明显是想提前给苏明打个预防针。

+ [继续 # choice:dch02_s011_continue]
    -> dch02_s012

=== dch02_s012 ===
# scene:dch02_s012
门开了。石佩欣穿着皮卡丘家居服，身后电脑上的图被她一键缩进任务栏，手速像销毁证据。苏明只瞥见一片肉色，没敢问。

她的目光在他胸前那块超市工牌上停留了一秒："收银的？"

+ [继续 # choice:dch02_s012_continue]
    -> dch02_s013

=== dch02_s013 ===
# scene:dch02_s013
"对，还兼职别的。"

"只要别在我楼里摆摊。"她开门见山，一点绕弯子的意思都没有，"抽烟？带人过夜？谈过对象没？谁提的分手？"

+ [分了……我提的 # choice:d2_admit_me]
    ~ admitted_breakup = true
    -> dch02_s014
+ [硬着头皮：我提的 # choice:d2_admit_me_hard]
    ~ admitted_breakup = true
    ~ impulse = impulse + 1
    -> dch02_s014

=== dch02_s014 ===
# scene:dch02_s014
问到"分手谁提的"这一句，热心过头的雷欧凑了过来，主动当起了翻译——先把这句话翻成英文讲给自己听懂，再翻回中文转述给苏明："她问，谁把谁扔掉了。"

"不是扔——"石佩欣一手扶额，一脸嫌弃，"滚一边去。"

+ [继续 # choice:dch02_s014_continue]
    -> dch02_s015

=== dch02_s015 ===
# scene:dch02_s015
"不抽。不带。分了，"苏明顿了顿，硬着头皮往下说，"我提的。"

"自己提的更稳。过。"

+ [继续 # choice:dch02_s015_continue]
    -> dch02_s016

=== dch02_s016 ===
# scene:dch02_s016
雷欧在她身后偷偷竖起大拇指，被一个眼神精准地扫到，当场被罚站到了楼梯口。他站在那儿，小声跟苏明总结起了经验："她的问题不用翻译，答案统一是'不敢'。"

楼道墙皮鼓包，屋里倒收拾得干净。一只橘猫窝在沙发上，跟房东本人一样，看谁都像在审核。雷欧摸了摸墙："Cool，Authentic。"

+ [继续 # choice:dch02_s016_continue]
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
    -> dch02_s017

=== dch02_s017 ===
# scene:dch02_s017
"你再交三个月房租，这墙就能补上。"石佩欣白了他一眼，"酷不能挡雨。"

楼是远房亲戚的，石佩欣代收房租，也代补墙。她既是租客又是管家，墙皮靠一茬茬租客按月喂。九百块，五号前交，备注栏禁止发表情包。

+ [继续 # choice:dch02_s017_continue]
    -> dch02_s018

=== dch02_s018 ===
# scene:dch02_s018
苏明这人嘴皮子有时比脑子还快："能不能——假设——带女朋友？"

+ [问出口：假设带女朋友？ # choice:d2_ask_guest]
    ~ asked_guest = true
    -> dch02_s019
+ [话到嘴边又咽回去……还是问了 # choice:d2_swallow_guest]
    ~ asked_guest = true
    ~ dignity = dignity - 1
    -> dch02_s019

=== dch02_s019 ===
# scene:dch02_s019
"你不是刚分？"

{ breakup_delivery == "flat":
    苏明又把那句报快递单似的“分手了。昨天。”搬出来，平得像只要不抖就不算丢人。
}
{ breakup_delivery == "hard":
    苏明下巴一硬：“真实的你要吗？我提的。”嘴还是那把临时搭的架子。
}

"……假设。"

+ [继续 # choice:dch02_s019_continue]
    -> dch02_s020

=== dch02_s020 ===
# scene:dch02_s020
"假设也不行。"她挥手，"我这楼的规矩比你那超市严。"打呼噜自己处理，锅铲不许拿来试隔音。猫跳下沙发，顺脚在苏明裤腿上补盖一道灰爪审核章。

扫完定金，石佩欣手写收条，字迹像医院处方。苏明只认出“九百”，其余选择信任。她最后补一刀："你兼职测什么的我不管，别把奇怪的人往楼里带，出事你自己扛。"

~ clue_rental_receipt = true
+ [继续 # choice:dch02_s020_continue]
    -> dch02_s021

=== dch02_s021 ===
# scene:dch02_s021
雷欧小声嘀咕："她是不是在说我？"

"你也扛。"

+ [继续 # choice:dch02_s021_continue]
    -> dch02_s022

=== dch02_s022 ===
# scene:dch02_s022
当夜，苏明搬了进来。行李是几个垃圾袋的升级版。

刚把最后一个袋子拖进屋，楼下就传来一阵急促的敲门声，一下比一下重。

+ [继续 # choice:dch02_s022_continue]
    -> dch02_s023

=== dch02_s023 ===
# scene:dch02_s023
苏明以为石佩欣反悔，手忙脚乱把东西塞回袋子才开门。门外只是隔壁抱保温杯的大爷："娃儿，你是不是新搬来的？楼下水表箱钥匙你晓不晓得放哪儿？"

+ [继续 # choice:dch02_s023_continue]
    -> dch02_s024

=== dch02_s024 ===
# scene:dch02_s024
"不晓得。我今天刚来。"大爷骂骂咧咧下楼找别人。苏明关门时才发现后背出了汗：租客身份没坐稳，先演练了一遍东窗事发。

+ [继续 # choice:dch02_s024_continue]
    -> dch02_s025

=== dch02_s025 ===
# scene:dch02_s025
雷欧帮着抬了半程行李，走到门口忽然刹住了脚步："昨天那事……你还去测？"

"去。钱没攒够。"

+ [让雷欧把行李抬进门 # choice:dch02_s025_continue]
    -> dch02_s026

=== dch02_s026 ===
# scene:dch02_s026
"攒什么？"

"房租。我爸。少问。"

+ [继续 # choice:dch02_s026_continue]
    -> dch02_s027

=== dch02_s027 ===
# scene:dch02_s027
雷欧比划两根手指："两份工，you crazy。"他掏出公司短信：招“实体设备全天候居家测试员”，补贴五倍，条件是独立房间和超级保密协议。

"测什么设备？"

~ clue_nda = true
+ [继续 # choice:dch02_s027_continue]
    -> dch02_s028

=== dch02_s028 ===
# scene:dch02_s028
"Robot。"雷欧压低了声音，眼睛瞪得溜圆，"真的 robot，抱回家那种。会说话，会——"他忽然卡壳了，一时半会儿没找到合适的词，索性改用手比划了一个说不清道不明的轮廓。

"你报了？"

+ [继续 # choice:dch02_s028_continue]
    -> dch02_s029

=== dch02_s029 ===
# scene:dch02_s029
"我？"雷欧往后一缩，"宿舍住不下。机器人晚上睁眼怎么办？我会死。"他把短信凑近：房间要拍，Super 保密协议要签，违约金后面五个零，材料比他的签证还多。

苏明嗤了一声："测那玩意儿的都有病。"

~ clue_nda = true
+ [嗤一声：测那玩意儿的都有病 # choice:d2_dismiss_robot]
    ~ robot_interest = "dismiss"
    -> dch02_s030
+ [嘴上骂，耳朵却竖起来 # choice:d2_curious_robot]
    ~ robot_interest = "curious"
    ~ impulse = impulse + 3
    -> dch02_s030

=== dch02_s030 ===
# scene:dch02_s030
雷欧耸了耸肩："你们中文场不也全天候被听？一样一样。"

"不一样。我那是上班。"

+ [继续 # choice:dch02_s030_continue]
    -> dch02_s031

=== dch02_s031 ===
# scene:dch02_s031
"上班，"雷欧点点头，一本正经地反驳，"他们也说，抱回家那个，也是上班。名字都起好了——"他看着短信念出来，"全、天、候、体、验、官。官哦，苏明。你们中国什么都能当官。"

苏明被噎住，索性把他轰出去。门一关，雷欧那句“一样一样”还卡在屋里。

+ [继续 # choice:dch02_s031_continue]
    -> dch02_s032

=== dch02_s032 ===
# scene:dch02_s032
躺上新床板，巷子里有人称重、讨价，隔壁回锅肉的油烟钻进来，说不上香还是呛。

手机震了一下，是他爸：钱到没有？腰又开始痛了，医生说要买个护腰。苏明回了一句"到了，最近忙"——其实钱还没转，得先紧着房租周转。他把这条消息前前后后看了两遍，扣在枕头边上，没再回什么。

+ [继续 # choice:dch02_s032_continue]
    -> dch02_s033

=== dch02_s033 ===
# scene:dch02_s033
他点开大学室友的对话框，最后一条是三个月前的婚礼请柬。输入半句，又删掉。

他不是想谈恋爱，只想屋里有个东西在场：不追问，不评判，到点还能关机。可楼里不许带人；测场那句“我不评判你”，背后又站着一屋子边听边嗑瓜子的耳朵。真人太贵，尊严也没库存。

+ [继续 # choice:dch02_s033_continue]
    -> dch02_s034

=== dch02_s034 ===
# scene:dch02_s034
{ memory_posture == "shame":
    交友软件刚亮，他的掌心先贴上脸，像昨晚那段记忆又来收一次遮羞费。
}
{ memory_posture == "hard":
    交友软件刚亮，他把下巴咬紧，继续往下划；硬撑这门手艺，平台之间倒是通用。
}

他划开手机上的交友软件消磨时间：一个简介写着"社恐找懂我的人"，全程用表情包代替说话；一个直接甩过来收款码，附言"验证真心"；再划一个，简介写着"不聊你死了都不知道"，配图是一只暹罗猫，瞪着两只圆眼睛。

划掉这些软件的时候，他的手指鬼使神差地点开了雷欧转发的那条招募链接。

+ [继续 # choice:dch02_s034_continue]
    -> dch02_s035

=== dch02_s035 ===
# scene:dch02_s035
落地页第一行字迎面撞过来："她不会评判你，只会理解你。"

{ robot_interest == "dismiss":
    他嘴里那句“都有病”还没过保质期，拇指已经替它办理了退货。
}
{ robot_interest == "curious":
    耳朵先前竖起来的那一下没白费；落地页刚开，他就知道自己会看到底。
}

苏明认得这句话，也认得字体。同一家公司，同一套话术，每个字都标过价；手指却继续下滑。至少这次，报价里可能附送一具能搬回家的机器。

+ [继续 # choice:dch02_s035_continue]
    -> dch02_s036

=== dch02_s036 ===
# scene:dch02_s036
评价区五星第一条写着："自从有了她，我再也不用假装很好。"八百多个赞。苏明点了“有用”，点完才发现，这比报名更丢脸。

他终究还是点了那个"申请成为体验官"的按钮。

+ [点下申请成为体验官 # choice:d2_apply]
    ~ applied_robot = true
    -> dch02_s037
+ [骂自己一句再点申请 # choice:d2_apply_shame]
    ~ applied_robot = true
    ~ dignity = dignity - 2
    -> dch02_s037

=== dch02_s037 ===
# scene:dch02_s037
问卷正经得过分：居住环境只拍没掉墙皮的死角；邻居容忍度从“一般”改成“良好”；“是否介意设备高度拟人”，他想了半天，介意的反义词到底是什么？

提交前弹出一份保密承诺，第七条加了粗：**设备之存在，不得让任何非签约人知晓，包括同住人。**

~ clue_nda = true
+ [继续 # choice:dch02_s037_continue]
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
    -> q2
+ [良好 # choice:mobile_questionnaire_q1_good]
    ~ mobile_questionnaire_q1 = "good"
    -> q2
+ [优秀 # choice:mobile_questionnaire_q1_excellent]
    ~ mobile_questionnaire_q1 = "excellent"
    -> q2
+ [不愿评价 # choice:mobile_questionnaire_q1_decline]
    ~ mobile_questionnaire_q1 = "decline"
    -> q2
+ [跳过问卷 # choice:mobile_questionnaire_q1_skip]
    -> skipped

= q2
# scene:dch02_mobile_questionnaire
# interaction:mobile-questionnaire-v1
# interaction-step:2
手机问卷 2/3 · 是否介意设备高度拟人。
+ [介意 # choice:mobile_questionnaire_q2_mind]
    ~ mobile_questionnaire_q2 = "mind"
    -> q3
+ [不介意 # choice:mobile_questionnaire_q2_fine]
    ~ mobile_questionnaire_q2 = "fine"
    -> q3
+ [不确定 # choice:mobile_questionnaire_q2_unsure]
    ~ mobile_questionnaire_q2 = "unsure"
    -> q3
+ [跳过问卷 # choice:mobile_questionnaire_q2_skip]
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
    -> dch02_s038

=== dch02_s038 ===
# scene:dch02_s038
苏明想起这楼里住着三个活人，还有一只猫，手指在屏幕上悬了悬，最终还是勾选了"已阅读并同意"。

深夜十一点四十分，他按下了提交。

+ [继续 # choice:dch02_s038_continue]
    -> dch02_s039

=== dch02_s039 ===
# scene:dch02_s039
三分钟后，短信回来了："初审通过。请于48小时内完成个性化匹配问卷。"

回得这么快，快得像是那头有人专门在等着他似的。

~ clue_pass_sms = true
+ [继续 # choice:dch02_s039_continue]
    -> dch02_s040

=== dch02_s040 ===
# scene:dch02_s040
{ robot_interest == "dismiss":
    嘴硬的账终于对上了：先骂体验官有病，再把自己送进初审。流程闭环。
}
{ robot_interest == "curious":
    他早把好奇藏在骂声后头；短信一亮，那个藏法正式失效。
}

苏明盯着这条短信看了半分钟，喃喃说了句："就当我有病。"

+ [继续 # choice:dch02_s040_continue]
    -> d2_chapter_end

=== d2_chapter_end ===
# scene:d2_chapter_end
短信屏幕还亮着。
+ [接受初审结果 # choice:d2_accept_crazy]
    -> END

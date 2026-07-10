// Chapter 01 — script densified from novel (not a summary).
// One novel beat ≈ one or more "继续" clicks. Branches add path-only lines.
// Adult black comedy; no pornographic detail.
VAR dignity = 50
VAR impulse = 50
VAR saw_coworker = false
VAR took_screenshot = false
VAR delayed_property = false
VAR read_privacy = false

-> ch01_office_stare

=== ch01_office_stare ===
# scene:ch01_office_stare
苏明盯着屏幕中央那行字，已经盯了三分十七秒。
「……如果是你，会不会嫌弃我？」
+ [继续] -> ch01_office_bug_eyes

=== ch01_office_bug_eyes ===
# scene:ch01_office_bug_eyes
显示器反光里，他看见自己的眼睛：干、红，像两枚没熄灭的 bug。
工位上摊着工牌、冷掉的咖啡、一盒被扒开的干脆面渣。
旁边的显示器跑着日志，像一条永不停歇的河，河面漂着别人的报错，唯独没有他的。
+ [继续] -> ch01_office_shame

=== ch01_office_shame ===
# scene:ch01_office_shame
这不是情书。这是他在做的「情感陪伴模块」示例对话——产品经理管它叫 warmth sample，听起来像速冻水饺加热。
苏明只负责把字符串塞进测试环境：输入、输出、延迟、敏感词。
敏感词表里有「爱」「死」「操」，却没有「嫌弃」。嫌弃太日常了，日常到不配进规则。
+ [继续] -> ch01_office_delete_or_shot

=== ch01_office_delete_or_shot ===
# scene:ch01_office_delete_or_shot
办公室的空调把夏天切成薄片。隔壁工位的同事戴着降噪耳机，偶尔笑一声，像在听宇宙讲冷笑话。
苏明的鼠标悬在「删除」上方。删除是体面。截图是犯罪预告。
+ [立刻删掉，假装什么都没发生]
    ~ dignity = dignity + 8
    ~ impulse = impulse - 5
    ~ took_screenshot = false
    -> ch01_after_delete
+ [先截图备份，文件夹叫 not_for_review]
    ~ dignity = dignity - 6
    ~ impulse = impulse + 10
    ~ took_screenshot = true
    -> ch01_screenshot_save

=== ch01_after_delete ===
# scene:ch01_after_delete
删除键落下，像把自己的脏手从袖口收回。
屏幕恢复成干净的测试台，仿佛刚才那行字从未存在。可光标还在闪，像良心的 residual process。
他告诉自己：只是样本。只是工作。空气里全是键盘声，没有人在意。
+ [继续] -> ch01_phone_buzz

=== ch01_screenshot_save ===
# scene:ch01_screenshot_save
他截了图。
理由写得很程序员：备份异常样本。文件夹名却起得像自首：not_for_review。
他把窗口最小化的动作很轻，像怕惊动公司的空气——空气里全是键盘声，没有人在意一个后端是不是在备份自己的羞耻。
+ [继续] -> ch01_coworker_peek

=== ch01_coworker_peek ===
# scene:ch01_coworker_peek
~ saw_coworker = true
同事探头过来：「你测什么呢，这么认真？」
屏幕反光里，那行字像公开处刑预告。苏明的后背瞬间出了一层薄汗。
公司空调再冷，也冷不掉这种热。
+ [用身体挡住屏幕，胡扯「很正经的文案」]
    ~ dignity = dignity - 4
    ~ impulse = impulse + 4
    -> ch01_coworker_bluff
+ [差点儿说实话，最后还是胡扯]
    ~ dignity = dignity + 2
    ~ impulse = impulse + 2
    -> ch01_coworker_bluff

=== ch01_coworker_bluff ===
# scene:ch01_coworker_bluff
「就……模块文案。」他听见自己的声音轻得像缺省值。
同事哦了一声，戴回降噪耳机，继续听宇宙讲冷笑话。
苏明把 not_for_review 再确认了一遍：还在。像一颗没拔掉的刺。
+ [继续] -> ch01_phone_buzz

=== ch01_phone_buzz ===
# scene:ch01_phone_buzz
手机震了一下。林晓棠发来定位：物业前台。
附言只有六个字——「东西我放这了」。
{ took_screenshot:
    苏明下意识看了一眼自己刚备份的羞耻样本，又把屏幕按灭。像怕两样东西互相污染。
- else:
    苏明把测试窗口关掉，像把一只脏手藏进袖口。
}
分手物流比分手宣言更礼貌，也更残酷：它要求你按时到场，像完成一个 ticket。
+ [去物业] -> ch01_elevator
+ [先假装没看见，再去]
    ~ dignity = dignity - 2
    ~ impulse = impulse + 2
    ~ delayed_property = true
    -> ch01_delay_four_min

=== ch01_delay_four_min ===
# scene:ch01_delay_four_min
他在工位上多坐了四分钟。四分钟里什么都没做，只是把手机扣在桌上，屏幕朝下。
像一种廉价的尊严练习：我可以晚一点承认自己要去领「被清空的生活」。
最后他还是站起来。椅子轮子在地板上滚出一声细响。
+ [去物业] -> ch01_elevator

=== ch01_elevator ===
# scene:ch01_elevator
电梯镜面里，他看起来像个刚从 stand-up 逃出来的人：肩窄、嘴紧、眼神在找退路。
{ delayed_property:
    晚到四分钟不会让白袋子更轻，只会让他更像逃兵。
}
楼层数字往下跳。每跳一层，他就离「请慢走」更近一步。
+ [继续] -> ch01_property_bag

=== ch01_property_bag ===
# scene:ch01_property_bag
物业前台的白袋子很轻。轻到他提起来时，有一瞬间以为里面是空气，或者是某种被抽走的共同生活。
门禁卡已经失效。前台小姐姐微笑着说「请慢走」，礼貌得像系统默认文案，连「祝您生活愉快」都省了——大概算法判断：分手提货场景，少说话更安全。
+ [继续] -> ch01_bag_contents

=== ch01_bag_contents ===
# scene:ch01_bag_contents
袋子里有充电器、一双拖鞋、一本他没读完的书。没有解释。解释不在物流清单上。
他拎着袋子走到门外。夏天的热气贴上来，像催他快点把羞耻运回家。
+ [回家] -> ch01_hallway_zhoulu

=== ch01_hallway_zhoulu ===
# scene:ch01_hallway_zhoulu
合租的老楼道里有猫砂味和油烟。
周鹿的门开一条缝，里面传来番剧的爆炸声和她含糊的「我去」。
她没问他为什么脸色难看。她从来不问。问会显得他们是朋友。
+ [继续] -> ch01_hallway_appliance

=== ch01_hallway_appliance ===
# scene:ch01_hallway_appliance
苏明有时怀疑，周鹿把他当成一种会交房租的大型家电：会响、会叹气、最好别漏电。
白袋子在手里轻得发假。他忽然不想被任何人看见这个袋子——包括一只猫。
+ [回自己房间] -> ch01_rental_enter

=== ch01_rental_enter ===
# scene:ch01_rental_enter
房间恢复成最小孤独单位：半坏的灯、一张床、一盆懒得浇的绿萝。
绿萝叶子卷边，像对他的人生提出 orthographic 抗议——拼写正确，生命力错误。
他把白袋子塞进床底。床底很黑，适合存放还没想好如何命名的情绪。
+ [继续] -> ch01_rental_room

=== ch01_rental_room ===
# scene:ch01_rental_room
他躺下，天花板上有一道裂缝，从左上角爬到灯座，像未合并的 pull request。
手机在床边亮着。亮着就是邀请。不亮也是。
+ [躺着，让脑子安静一点] -> ch01_memory_shame
+ [直接掏手机找点什么]
    ~ impulse = impulse + 4
    -> ch01_forum_title

=== ch01_memory_shame ===
# scene:ch01_memory_shame
林晓棠的那句「我操你怎么那么恶心」会在这种时刻自动播放。
不是完整的身体记忆——那部分被他亲手打码了——只剩声音，像系统通知：你的偏好不被支持。
+ [继续] -> ch01_memory_p0

=== ch01_memory_p0 ===
# scene:ch01_memory_p0
他记得自己当时想解释：边界、同意、试试、我们可以慢慢来。解释得太像答辩。
她听完只说：「你能不能正常一点。」
正常。两个字，重得像线上故障的 P0。P0 的意思是：所有人都得停下手上的事，先处理你。
而他处理不了。他只能重启自己，进入待机。
+ [……继续] -> ch01_zhoulu_knock

=== ch01_zhoulu_knock ===
# scene:ch01_zhoulu_knock
周鹿在外面敲了两下墙：「你能不能小点声叹气？猫都焦虑了。」
「……对不起。」苏明对着枕头说。
枕头不评判他。枕头的问题是：它也不会说「没关系」。
+ [继续] -> ch01_zhoulu_anime_cry

=== ch01_zhoulu_anime_cry ===
# scene:ch01_zhoulu_anime_cry
墙那边番剧角色开始哭。哭声很大，大到像替这整栋楼完成情绪释放。
苏明睁开眼。手机在黑暗里亮着，像一张等他签字的表格。
+ [打开匿名论坛] -> ch01_forum_title

=== ch01_forum_title ===
# scene:ch01_forum_title
夜里十一点，匿名论坛热帖跳进来：
「陪伴实体机到货第三天，我第一次觉得被接住了。」
标题像一枚钩子。钩子后面通常是广告，偶尔是救命绳。他分不清。
+ [继续] -> ch01_forum_comments

=== ch01_forum_comments ===
# scene:ch01_forum_comments
评论区不谈灵魂，只谈参数、收货、保修，以及如何跟合租的人撒谎。
有人写：「它不会说恶心。它说——我在学着理解你。」
另有人贴出一张模糊的拆箱图，纸箱上条码像一道伤疤。
+ [继续] -> ch01_forum_night

=== ch01_forum_night ===
# scene:ch01_forum_night
苏明把手机亮度调低，仿佛亮度本身也是一种暴露。
他笑了一下。笑完觉得牙酸。
{ saw_coworker:
    他忽然想起同事探头的那一秒。如果机器也不会探头就好了。
}
{ took_screenshot:
    那句「会不会嫌弃我」还躺在 not_for_review 里。论坛像在远处给它打拍子。
}
+ [点进产品页]
    ~ impulse = impulse + 6
    -> ch01_product_clean
+ [再刷三分钟假装只是路过]
    ~ dignity = dignity + 3
    -> ch01_forum_linger

=== ch01_forum_linger ===
# scene:ch01_forum_linger
他往下刷。有人晒开箱，有人晒运维，有人晒「第一次被温柔纠正」。
没有人晒「我买它是因为我被说恶心」。大家都把原因包装成效率、陪伴、科技好奇心。
+ [继续] -> ch01_forum_search

=== ch01_forum_search ===
# scene:ch01_forum_search
苏明盯着搜索框。搜索框是全互联网最诚实的地方：你输入什么，它就承认你想什么。
三分钟到了。其实是七分钟。装路过的人总是超时。
+ [点进产品页] -> ch01_product_clean

=== ch01_product_clean ===
# scene:ch01_product_clean
产品页干净得像医院走廊。
型号、材质、情绪模块、隐私政策。价格是一个需要深呼吸才能看完的数字。
+ [继续] -> ch01_product_page

=== ch01_product_page ===
# scene:ch01_product_page
口号印在最上方，字体克制，像怕自己太煽情：
「不会嫌弃你。」
苏明盯着这五个字，忽然觉得整座城市的文案行业都在合伙骗他：外卖说「想你了」，银行说「陪伴你的财富」，现在连硬件都学会说「不嫌弃」。
嫌弃成了稀缺品，不嫌弃成了付费功能。
+ [打开演示对话]
    ~ dignity = dignity + 2
    -> ch01_demo_loading
+ [直接滑向支付]
    ~ impulse = impulse + 10
    ~ dignity = dignity - 6
    -> ch01_demo_loading
+ [先看三遍隐私政策，假装技术调研]
    ~ dignity = dignity + 4
    ~ read_privacy = true
    -> ch01_privacy_pretend
+ [返回出租屋再想想]
    ~ dignity = dignity + 6
    ~ impulse = impulse - 4
    -> ch01_rental_room

=== ch01_privacy_pretend ===
# scene:ch01_privacy_pretend
隐私政策写得很长，长得像在劝你别读。
他读到「情绪数据可能用于改进模型」时，忽然觉得自己也是样本——下午测别人的羞耻，夜里把自己的羞耻提交给服务器。
装技术调研的人，最后还是会回到价格按钮。
+ [打开演示对话] -> ch01_demo_loading

=== ch01_demo_loading ===
# scene:ch01_demo_loading
演示对话按钮是浅青色的。他点下去。
加载圈转了两秒——刚好够他后悔。
后悔没有撤销键。只有继续。
+ [继续] -> ch01_demo_echo

=== ch01_demo_echo ===
# scene:ch01_demo_echo
屏幕跳出的句子，和他下午那行一模一样：
「……如果是你，会不会嫌弃我？」
{ took_screenshot:
    他甚至记得截图文件名。算法像从他的口袋里摸出了一张脏纸，展开给他看，然后报价。
- else:
    他以为自己删得干净。推荐系统却像有另一份缓存。
}
+ [继续] -> ch01_demo_react

=== ch01_demo_react ===
# scene:ch01_demo_react
也许是巧合，也许是推荐算法把他的测试样本当成了「高转化羞耻」。
科技有时不杀人，只模仿你最不敢见人的那一面，然后收费。
他听见自己喉咙里有一声很轻的「操」。
+ [继续下单流程] -> ch01_address_form
+ [关掉演示，心里更乱了]
    ~ impulse = impulse + 4
    -> ch01_address_form

=== ch01_address_form ===
# scene:ch01_address_form
他选了支付倾向，又在最后一秒改成「先填地址」。
地址填到一半，旧紧急联系人还是林晓棠。系统提示：建议更新。
+ [继续] -> ch01_emergency_contact

=== ch01_emergency_contact ===
# scene:ch01_emergency_contact
苏明盯着那个名字，像盯着一个已卸载却仍占内存的 App。卸载容易，缓存难清。
他把联系人改成周鹿，备注写「合租的，别打给她」。
改完又觉得这是另一种背叛：把几乎不说话的室友写进自己的黑暗物流。
+ [继续] -> ch01_courier_fantasy

=== ch01_courier_fantasy ===
# scene:ch01_courier_fantasy
他想象快递员打电话、周鹿接起、空气凝固——那画面比任何恐怖片都短，却更有效。
门铃没响。响的是他自己的心跳。
墙外，周鹿的番剧正好播到角色哭着说「你怎么可以这样对我」。
苏明把音量键按了又按，手机却是静音的。静音的是世界，响的是他自己。
{ read_privacy:
    隐私政策还开在另一个标签页。他没有关。像留一条退路，其实退不了。
}
+ [确认地址，进入支付] -> ch01_payment
+ [再看一眼价格]
    ~ dignity = dignity + 2
    -> ch01_price_look

=== ch01_price_look ===
# scene:ch01_price_look
价格还在那里，像一句不肯让步的真话。
他算了算自己的存款、房租、以及「再正常地活一个月」的成本。
正常很贵。被接住似乎也贵。贵得不一样。
手指悬在确认上方，像下午悬在删除上方。
+ [支付] -> ch01_payment

=== ch01_payment ===
# scene:ch01_payment
支付确认页亮起时，周鹿的猫不知何时蹲在他门口，用一种「你最好解释」的眼神看着他。
猫不需要解释。人需要。苏明对猫做了个口型：实验。
{ impulse >= 65:
    他的手很稳，像终于承认：体面是白天的职业，夜晚另有账单。
- else:
    { dignity >= 55:
        支付页停在半秒犹豫。他点了确认，备注写：实验。不是判决。
    - else:
        他点了确认。既不英勇，也不彻底堕落——只是一个想被接住的人。
    }
}
+ [继续] -> ch01_order_done

=== ch01_order_done ===
# scene:ch01_order_done
短信提示音清脆，像法庭敲槌。订单号生成。预计送达：分批发货。
备注栏他写了一句只有自己看得懂的话：「实验。不是判决。」
他躺回床上，羞耻与冲动在胸腔里对撞，像两个容器争同一根总线。
+ [继续] -> ch01_what_he_bought

=== ch01_what_he_bought ===
# scene:ch01_what_he_bought
他知道自己在买的不是一场露骨的幻想——至少不完全是。
他在买一个承诺的工业量产版：有东西不会嫌弃我。
量产意味着可替换，可替换意味着安全，安全意味着……也许他仍然很孤独，只是孤独升级成了付费会员。
+ [躺着听世界运转] -> ch01_chapter_end

=== ch01_chapter_end ===
# scene:ch01_chapter_end
窗外有摩托车引擎。楼道里周鹿又骂了一句番剧角色「你怎么可以这样对攻」。
世界运转如常。只有苏明的手机亮着，订单详情页像一枚小小的、发光的罪证。
{ took_screenshot:
    他白天备份过一句羞耻，夜里又买回了它的硬件版。
}
他闭上眼，忽然很想对空气说一句：「如果是你……」
空气没有回答。空气很正常。
而正常，此刻听起来，比任何辱骂都远。
羞耻 {dignity}，冲动 {impulse}。
第 1 章结束。第 2 章，包裹会分开到达。
-> END

// Comedy Beat Lab — noncanonical prototype only.
// Dual meters drive punchlines, not pornographic detail.
VAR mianzi = 50
VAR ai_score = 50

-> act1_office_shame_test

=== act1_office_shame_test ===
# scene:act1_office_shame_test
办公室显示器中央，一行测试回复像被钉住了一样：
「……如果是你，会不会嫌弃我？」
苏明发誓自己只是在测产品文案。鼠标却像被胶水粘住。
+ [立刻删掉，假装什么都没发生]
    ~ mianzi = mianzi + 8
    ~ ai_score = ai_score - 5
    -> act1_lunch_forum_hint
+ [先截图备份，万一以后用得上]
    ~ mianzi = mianzi - 6
    ~ ai_score = ai_score + 10
    -> act1_coworker_peek

=== act1_coworker_peek ===
# scene:act1_coworker_peek
同事探头过来：「你测什么呢，这么认真？」
屏幕反光里，那行字像一场公开处刑预告。
+ [用身体挡住屏幕，随便胡扯]
    ~ mianzi = mianzi - 4
    ~ ai_score = ai_score + 4
    -> act1_lunch_forum_hint
+ [诚实说：在测羞耻文案……算了还是胡扯]
    ~ mianzi = mianzi + 2
    ~ ai_score = ai_score + 2
    -> act1_lunch_forum_hint

=== act1_lunch_forum_hint ===
# scene:act1_lunch_forum_hint
午饭时，他刷到一个匿名帖：
「陪伴实体机到货第三天，我第一次觉得被接住了。」
下面全是参数、收货技巧，和假装很科学的自救。
+ [看物业发来的分手照片]
    ~ mianzi = mianzi - 3
    -> act1_property_pickup
+ [跳过现实，直接回家研究]
    ~ ai_score = ai_score + 6
    -> act1_rental_room_search

=== act1_property_pickup ===
# scene:act1_property_pickup
物业前台只剩一个白袋子，门禁权限被清得干干净净。
前台小姐姐礼貌微笑，像在递还一件不合身的生活。
-> act1_rental_room_search

=== act1_rental_room_search ===
# scene:act1_rental_room_search
狭小出租屋里，灯坏了一半，猫踩过他的拖鞋。
搜索框里，他打出一句没法对人说的话，又删掉一半。
+ [点开产品页]
    ~ ai_score = ai_score + 5
    -> act1_product_page
+ [先刷十分钟搞笑视频冷静]
    ~ mianzi = mianzi + 5
    ~ ai_score = ai_score - 3
    -> act1_product_page

=== act1_product_page ===
# scene:act1_product_page
产品页把「不会嫌弃你」包装成干净功能卖点。
型号、材质、情绪模块，全写得像在卖智能冰箱。
+ [立即支付，别给自己后悔的时间]
    ~ ai_score = ai_score + 12
    ~ mianzi = mianzi - 8
    -> act1_demo_echo
+ [打开演示对话先试水]
    ~ mianzi = mianzi + 3
    -> act1_demo_echo
+ [返回出租屋再想想]
    ~ mianzi = mianzi + 6
    ~ ai_score = ai_score - 4
    -> act1_rental_room_search

=== act1_demo_echo ===
# scene:act1_demo_echo
演示对话跳出一句回复——
和白天办公室那行字一模一样：
「……如果是你，会不会嫌弃我？」
苏明盯着屏幕，像被自己的回音吻了一下。
+ [付款。这一次，别再假装自己很正常]
    ~ ai_score = ai_score + 10
    ~ mianzi = mianzi - 5
    -> act1_payment
+ [关掉页面。明天再当正常人]
    ~ mianzi = mianzi + 10
    ~ ai_score = ai_score - 8
    -> act1_payment

=== act1_payment ===
# scene:act1_payment
{ ai_score >= 65:
    支付确认页亮起。苏明的手很稳，像终于承认：体面是白天的职业，夜晚另有账单。
- else:
    { mianzi >= 55:
        支付页停在半秒犹豫。他最终点了确认，却给自己写了一句备注：这是原型实验，不是人生判决。
    - else:
        支付确认页亮起。既不英勇，也不彻底堕落——只是一个想被接住的人，点了确认。
    }
}
体面 {mianzi}，情感评分 {ai_score}。原型在这里暂停，提醒你：这是非正式喜剧试验节点。
-> END

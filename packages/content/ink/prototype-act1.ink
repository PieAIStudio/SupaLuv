-> act1_office_shame_test

=== act1_office_shame_test ===
# scene:act1_office_shame_test
办公室里，苏明把一句测试回复留在屏幕中央。这里只是原型占位，不是正式剧情。
+ [继续测试] -> act1_lunch_forum_hint

=== act1_lunch_forum_hint ===
# scene:act1_lunch_forum_hint
午饭时，他刷到一个讨论陪伴实体机的论坛贴。这里只保留流程，不保留原章正文。
+ [看物业照片] -> act1_property_pickup
+ [跳过论坛直接回家] -> act1_rental_room_search

=== act1_property_pickup ===
# scene:act1_property_pickup
物业前台只剩一个白袋子和被清掉的门禁权限。
-> act1_rental_room_search

=== act1_rental_room_search ===
# scene:act1_rental_room_search
回到狭小出租屋后，他开始把注意力转向一台产品机器。
+ [点开产品页] -> act1_product_page

=== act1_product_page ===
# scene:act1_product_page
产品页把“不会嫌弃你”包装成一条干净的功能卖点。
+ [立即支付] -> act1_payment
+ [返回出租屋再想想] -> act1_rental_room_search

=== act1_payment ===
# scene:act1_payment
支付确认页亮起。原型在这里停下，提醒这是非正式试验节点。
-> END

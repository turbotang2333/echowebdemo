// ============================================================
// 剧情脚本数据
// ============================================================

// 文字层演示脚本：两轮对话循环
// narration 是旁白；以「（」开头会自动判为动作旁白（蓝调）
// dialogue 是对话，speaker 用 'you' / 'him'
window.TEXT_SCRIPT = {
  charTurns: [
    {
      action: '他靠在栏杆上，听见门响才转过头来。',
      replies: ['你来了。', '我以为你不会来。'],            // R1：2 条气泡
    },
    {
      action: '他笑了笑，下巴朝海面的方向抬了抬。',
      replies: ['也没多久。', '你来的正好。', '你来得正好，再晚一会儿天就要黑透了，那点橘色就要散在海里了。'], // R2：3 条，末条 30 字压测（15×2 触顶）
    },
  ],
  userReplies: ['等很久了？', '那就好。'],
};

// 历史剧情：左上角锚点打开历史面板时展示
window.HISTORY_SCRIPT = [
  { type: 'narration', text: '风从城市的边缘吹来，带着远处海面的咸味。他靠在栏杆上，望着渐渐暗下来的天际线。你推开天台的门，铰链发出一声干涩的响。' },
  { type: 'dialogue',  speaker: 'you', text: '等很久了？' },
  { type: 'narration', text: '（他听到门响，转过头，嘴角微微扬了一下。）' },
  { type: 'dialogue',  speaker: 'him', text: '你来了。还好，看了会儿日落。不知道值不值得看，但有人一起看的话，大概更值得。' },
  { type: 'dialogue',  speaker: 'you', text: '那我算来对了。' },
  { type: 'narration', text: '（他往旁边让了半步，腾出栏杆的位置，下巴朝天际线的方向抬了抬。）' },
  { type: 'dialogue',  speaker: 'him', text: '你有没有想过，有些事情只有在黄昏才能说出口？白天太亮，什么都看得见。晚上又太暗，什么都看不到。只有这一会儿，刚好。' },
  { type: 'dialogue',  speaker: 'you', text: '什么意思？' },
  { type: 'narration', text: '（他转过身，靠在栏杆上，双手插进口袋，目光落在远处海面上。）' },
  { type: 'dialogue',  speaker: 'him', text: '……没什么。就是想让你也看看这个。你看那边，最后一点橘色快散了。' },
  { type: 'dialogue',  speaker: 'you', text: '我看到了。' },
  { type: 'narration', text: '（他伸出手，指向天际线尽头。风把他的衣角吹起来，他没有收回手。）' },
  { type: 'dialogue',  speaker: 'him', text: '小时候觉得日落很慢。现在觉得太快了，快到来不及跟人说一句"你看"。所以今天叫你来。' },
  { type: 'dialogue',  speaker: 'you', text: '……就为了这个？' },
  { type: 'narration', text: '（他收回手，低头笑了一下，像是被说中了什么。）' },
  { type: 'dialogue',  speaker: 'him', text: '嗯。就为了这个。你觉得不够吗？有些事情不需要理由的，想让你看到，就够了。' },
  { type: 'narration', text: '你们就这样安静地站了很久。城市的灯光一盏一盏亮起来，像是接替了落日的工作。天台上的风大了些，带着夜晚独有的凉意。' },
  { type: 'narration', text: '远处有几只海鸥掠过水面，留下短暂的影子。有那么一瞬间，你觉得时间在这座天台上走得格外慢，慢到足够把每一秒都记住。' },
  { type: 'dialogue',  speaker: 'you', text: '还好。' },
  { type: 'narration', text: '（他偏过头看了你一眼，没说话，但往你这边靠了半步，刚好够挡住一点风。）' },
  { type: 'dialogue',  speaker: 'him', text: '你每次说"还好"的时候，其实都在逞强。我知道，因为我也会这样。' },
  { type: 'dialogue',  speaker: 'you', text: '你怎么知道？' },
  { type: 'narration', text: '（他没有看你，但嘴角弯了一下。手从口袋里抽出来，搭在栏杆上，离你的手很近。）' },
  { type: 'dialogue',  speaker: 'him', text: '因为说"还好"的人，其实是在等对方多问一句。我有时候觉得，人和人之间的距离，其实就是一句没说出口的话。' },
  { type: 'dialogue',  speaker: 'you', text: '那你现在说出口了。' },
  { type: 'narration', text: '（他终于转过头看你，眼睛里映着远处的万家灯火，视线没有躲。）' },
  { type: 'dialogue',  speaker: 'him', text: '是啊。所以近了一点。走吧，带你去个地方。' },
  { type: 'dialogue',  speaker: 'you', text: '去哪儿？' },
  { type: 'narration', text: '（他从栏杆上直起身，拍了拍手上的锈，朝楼梯的方向偏了偏头。）' },
  { type: 'dialogue',  speaker: 'him', text: '一个只有我知道的地方。不远，走几步就到。小时候我经常来，那时候觉得只要走到那盏灯下面，所有不开心的事情就会消失。' },
  { type: 'dialogue',  speaker: 'you', text: '现在呢？' },
  { type: 'narration', text: '（他停下脚步，回头看你，走廊里的灯光刚好落在他半边脸上。）' },
  { type: 'dialogue',  speaker: 'him', text: '现在不需要走到灯下了。谢谢你今天来。不是客气，是真的觉得——有些时刻，如果没有人分享，就像从来没发生过一样。' },
  { type: 'dialogue',  speaker: 'you', text: '你不用谢我。' },
  { type: 'narration', text: '（他推开一扇半掩的铁门，侧身让你先过。门外是一条窄巷，巷子尽头有一盏暖黄色的灯。）' },
  { type: 'dialogue',  speaker: 'him', text: '你先走，我跟着。这条路有点暗，不过很快就到了。到了你就知道为什么我喜欢这里。' },
  { type: 'narration', text: '暖黄色的灯光越来越近，照亮了他侧脸柔和的轮廓。巷子里很窄，你们肩并肩地走着，偶尔手背会不经意地碰到一起。' },
  { type: 'narration', text: '你忽然很想记住这一刻——风声、灯光、和他说话时嘴角微微上扬的弧度。' },
];

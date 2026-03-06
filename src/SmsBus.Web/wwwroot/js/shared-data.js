// === 共享数据: 国家列表、服务列表、翻译映射 ===

const ACT_COUNTRIES = [
    {code:'FR',name:'法国'},
    {code:'US',name:'美国'},{code:'UK',name:'英国'},{code:'CA',name:'加拿大'},
    {code:'DE',name:'德国'},{code:'ES',name:'西班牙'},
    {code:'IT',name:'意大利'},{code:'NL',name:'荷兰'},{code:'SE',name:'瑞典'},
    {code:'PL',name:'波兰'},{code:'RO',name:'罗马尼亚'},{code:'CZ',name:'捷克'},
    {code:'PT',name:'葡萄牙'},{code:'AT',name:'奥地利'},{code:'BE',name:'比利时'},
    {code:'RU',name:'俄罗斯'},{code:'UA',name:'乌克兰'},{code:'KZ',name:'哈萨克斯坦'},
    {code:'CN',name:'中国'},{code:'HK',name:'香港'},{code:'TW',name:'台湾'},
    {code:'JP',name:'日本'},{code:'KR',name:'韩国'},{code:'IN',name:'印度'},
    {code:'ID',name:'印尼'},{code:'PH',name:'菲律宾'},{code:'TH',name:'泰国'},
    {code:'VN',name:'越南'},{code:'MY',name:'马来西亚'},{code:'MX',name:'墨西哥'},
    {code:'BR',name:'巴西'},{code:'AR',name:'阿根廷'},{code:'CO',name:'哥伦比亚'},
    {code:'CL',name:'智利'},{code:'AU',name:'澳大利亚'},{code:'NZ',name:'新西兰'},
    {code:'TR',name:'土耳其'},{code:'EG',name:'埃及'},{code:'NG',name:'尼日利亚'},
    {code:'ZA',name:'南非'},{code:'IL',name:'以色列'},{code:'AE',name:'阿联酋'}
];

// 服务代码→中文翻译映射（一次性接码 + 长期租赁通用）
// 一次性接码服务列表从 SMSPVA API 动态获取
const SERVICE_ZH = {
    // === 一次性接码（代码来自 SMSPVA get_services API）===
    'opt1':'谷歌/Gmail','opt2':'脸书','opt5':'OK社交','opt10':'AOL邮箱',
    'opt15':'微软(Azure/Bing/Skype)','opt16':'Ins图片/Threads',
    'opt20':'WhatsApp聊天','opt29':'电报','opt41':'推特/X',
    'opt44':'亚马逊','opt46':'爱彼迎','opt56':'Badoo交友',
    'opt58':'Steam游戏','opt67':'微信','opt78':'暴雪游戏',
    'opt81':'Bolt出行','opt83':'贝宝/易贝','opt86':'耐克/阿迪达斯',
    'opt98':'Clubhouse','opt104':'抖音国际版','opt112':'Coinbase交易所',
    'opt124':'Credit Karma','opt131':'苹果','opt132':'OpenAI/ChatGPT',
    'opt145':'Bumble交友','opt196':'Claude(Anthropic)',
    // === 长期租赁（代码来自 SMSPVA rental API）===
    'opt0':'汇款(Wise)','opt3':'暴雪游戏','opt6':'Fiverr自由职业','opt7':'Wirex钱包',
    'opt8':'领英','opt9':'Tinder交友','opt10':'币安','opt11':'Viber聊天','opt15':'微软',
    'opt16':'Ins图片','opt17':'Verse支付','opt20':'WhatsApp聊天','opt24':'WebMoney钱包',
    'opt26':'Nexo理财','opt27':'交友(OurTime)','opt28':'问卷调查','opt29':'电报',
    'opt31':'Vinted二手','opt32':'LINE聊天','opt34':'Indeed招聘','opt35':'汇款(MoneyGram)',
    'opt37':'博彩/银行','opt38':'PaySend汇款','opt39':'问卷调查','opt41':'推特/X',
    'opt42':'Pyypl钱包','opt43':'bet365博彩','opt44':'亚马逊','opt45':'Bankera银行',
    'opt46':'爱彼迎','opt47':'Coinbase交易所','opt48':'交友(OkCupid)','opt53':'中继Fi',
    'opt54':'Gemini交易所','opt56':'Crypto加密','opt57':'BITSA/BITSO','opt58':'Steam游戏',
    'opt60':'Ria汇款','opt61':'阿里巴巴/淘宝/支付宝','opt65':'雅虎','opt66':'Twilio/eToro',
    'opt68':'EUROBET博彩','opt70':'Coinbase交易所','opt72':'Paxful交易','opt74':'Skrill钱包',
    'opt75':'MoneyLion理财','opt76':'Weststein万事达','opt77':'1xbet博彩','opt78':'Volet钱包',
    'opt81':'Kraken交易所','opt82':'西联汇款','opt83':'贝宝/易贝','opt84':'交友(POF)',
    'opt85':'Venmo支付','opt88':'缤客(Booking)','opt90':'Paysafe支付','opt92':'股票交易',
    'opt93':'Phyre钱包','opt95':'OKX交易所','opt96':'交友(Match)','opt99':'iCard卡',
    'opt100':'Vivid银行','opt101':'Revolut银行','opt102':'AstroPay支付','opt103':'Payoneer支付',
    'opt104':'抖音国际版','opt140':'MoneyJar','opt142':'其他服务','opt144':'黑猫卡',
    'opt146':'票务大师','opt147':'Discord语音','opt149':'Wallester卡','opt152':'Guavapay支付',
    'opt153':'Signal加密','opt154':'苹果','opt158':'Fonbet博彩','opt159':'Paytend支付',
    'opt160':'Trastra卡','opt161':'Airwallex万里汇','opt165':'Bumble交友','opt166':'KuCoin/Bybit',
    'opt167':'Lydia银行','opt169':'VRBO民宿','opt171':'Fbet博彩','opt173':'Swagbucks返利',
    'opt178':'分类广告','opt180':'TransferGo汇款','opt185':'Hinge交友','opt186':'Namirial签名',
    'opt190':'Foxpay支付','opt191':'MyBookie博彩','opt192':'沃尔玛','opt196':'Payzy支付',
    'opt198':'京东','opt199':'Bitpanda交易','opt200':'VFS签证','opt201':'KCEX交易所',
    'opt202':'PecunPay支付','opt203':'Bit2Me交易','opt204':'Airtm钱包','opt205':'Payz支付',
    'opt207':'Bitnovo','opt208':'RedotPay卡','opt210':'Betano博彩','opt211':'NCSOFT游戏',
    'opt212':'TapTap游戏','opt213':'Brighty银行','opt214':'Bovada博彩','opt216':'Leboncoin二手',
    'opt217':'Outlier数据','opt218':'Rebet博彩','opt219':'奖励卡','opt220':'Green Dot银行',
    'opt222':'Mobile.de汽车','opt223':'HardRock博彩','opt225':'奈飞','opt226':'WEEX交易所',
    'opt228':'WorldRemit汇款','opt230':'Global66汇款','opt231':'Betly博彩','opt235':'OnShop购物',
    'opt236':'Bitget交易所','opt237':'Toloka众包','opt1001':'Neteller钱包'
};

const COUNTRY_ZH = {
    'Russia':'俄罗斯','Ukraine':'乌克兰','Kazakhstan':'哈萨克斯坦','China':'中国',
    'Philippines':'菲律宾','Myanmar':'缅甸','Indonesia':'印尼','Malaysia':'马来西亚',
    'Vietnam':'越南','Kyrgyzstan':'吉尔吉斯斯坦','USA':'美国','United States':'美国',
    'United Kingdom':'英国','UK':'英国','England':'英国','Unt. Kingdom':'英国',
    'Canada':'加拿大','Germany':'德国','France':'法国','Spain':'西班牙',
    'Italy':'意大利','Netherlands':'荷兰','Sweden':'瑞典','Poland':'波兰',
    'Romania':'罗马尼亚','Czech Republic':'捷克','Czechia':'捷克',
    'Portugal':'葡萄牙','Austria':'奥地利','Belgium':'比利时',
    'Hong Kong':'香港','Taiwan':'台湾','Japan':'日本','South Korea':'韩国',
    'Korea':'韩国','India':'印度','Thailand':'泰国',
    'Mexico':'墨西哥','Brazil':'巴西','Argentina':'阿根廷','Colombia':'哥伦比亚',
    'Chile':'智利','Peru':'秘鲁','Ecuador':'厄瓜多尔','Bolivia':'玻利维亚',
    'Australia':'澳大利亚','New Zealand':'新西兰',
    'Turkey':'土耳其','Egypt':'埃及','Nigeria':'尼日利亚','South Africa':'南非',
    'Israel':'以色列','UAE':'阿联酋','United Arab Emirates':'阿联酋',
    'Saudi Arabia':'沙特阿拉伯','Georgia':'格鲁吉亚','Armenia':'亚美尼亚',
    'Azerbaijan':'阿塞拜疆','Uzbekistan':'乌兹别克斯坦','Tajikistan':'塔吉克斯坦',
    'Moldova':'摩尔多瓦','Belarus':'白俄罗斯','Latvia':'拉脱维亚',
    'Lithuania':'立陶宛','Estonia':'爱沙尼亚','Croatia':'克罗地亚',
    'Serbia':'塞尔维亚','Bulgaria':'保加利亚','Hungary':'匈牙利',
    'Slovakia':'斯洛伐克','Slovenia':'斯洛文尼亚','Greece':'希腊',
    'Finland':'芬兰','Denmark':'丹麦','Norway':'挪威','Ireland':'爱尔兰',
    'Switzerland':'瑞士','Luxembourg':'卢森堡','Malta':'马耳他','Cyprus':'塞浦路斯',
    'Morocco':'摩洛哥','Tunisia':'突尼斯','Kenya':'肯尼亚','Ghana':'加纳',
    'Tanzania':'坦桑尼亚','Uganda':'乌干达','Cameroon':'喀麦隆',
    'Pakistan':'巴基斯坦','Bangladesh':'孟加拉','Sri Lanka':'斯里兰卡',
    'Nepal':'尼泊尔','Cambodia':'柬埔寨','Laos':'老挝','Mongolia':'蒙古',
    'Singapore':'新加坡','Macau':'澳门','Macao':'澳门',
    'Dominican Republic':'多米尼加','Costa Rica':'哥斯达黎加','Panama':'巴拿马',
    'Venezuela':'委内瑞拉','Uruguay':'乌拉圭','Paraguay':'巴拉圭',
    'Guatemala':'危地马拉','Honduras':'洪都拉斯','El Salvador':'萨尔瓦多',
    'Nicaragua':'尼加拉瓜','Cuba':'古巴','Jamaica':'牙买加',
    'Trinidad and Tobago':'特立尼达和多巴哥','Haiti':'海地',
    'Algeria':'阿尔及利亚','Libya':'利比亚','Sudan':'苏丹',
    'Ethiopia':'埃塞俄比亚','Somalia':'索马里','Congo':'刚果',
    'Ivory Coast':'科特迪瓦','Senegal':'塞内加尔','Mali':'马里',
    'Madagascar':'马达加斯加','Mozambique':'莫桑比克','Zimbabwe':'津巴布韦',
    'Zambia':'赞比亚','Angola':'安哥拉','Botswana':'博茨瓦纳',
    'Iraq':'伊拉克','Iran':'伊朗','Syria':'叙利亚','Jordan':'约旦',
    'Lebanon':'黎巴嫩','Kuwait':'科威特','Qatar':'卡塔尔','Bahrain':'巴林',
    'Oman':'阿曼','Yemen':'也门','Afghanistan':'阿富汗'
};

// === 共享工具函数 ===
function translateCountry(name) {
    if (!name) return name;
    return COUNTRY_ZH[name] || COUNTRY_ZH[name.trim()] || name;
}

function svcZh(code) {
    return SERVICE_ZH[code] || '';
}

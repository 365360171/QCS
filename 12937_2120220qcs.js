const axios = require('axios');
const $ = {}
let http = undefined
async function sign() {
    const result = await http.post(
        "https://mystore-01api.watsonsvip.com.cn/wx/signIn/iter/sign",
        { "unionId": $.unionid },
    );
    if (result.data.code == 0 || result.data.code == 11000) {
        return result.data
    }
    $.signResult = result.data.errorMsg
    return false
}

async function submission(data) {
    const result = await http.post("https://mystore-01api.watsonsvip.com.cn/cloudapi/v2/users/tasks/complete",
        data)
    if (result.data.code != 0) {
        console.log(result.data.errorMsg)
        return false
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}


async function getTaskToken(taskId) {
    const result = await http.get("https://mystore-01api.watsonsvip.com.cn/cloudapi/v2/users/tasks/browserTask/token/" + taskId)
    if (result.data.code != 0) {
        console.log(result.data.errorMsg)
        return false
    }
    return result.data.result.token
}


async function getTaskList() {
    const result = await http.get("https://mystore-01api.watsonsvip.com.cn/cloudapi/v2/users/tasks")
    if (result.data.code != 0) {
        console.log(result.data.errorMsg)
        return false
    }
    return result.data.result.list
}

async function receiveTaskReturn(data) {
    const result = await http.post("https://mystore-01api.watsonsvip.com.cn/cloudapi/v2/users/receive",
        { "prizeId": data })
    if (result.data.code != 0) {
        console.log(result.data.errorMsg)
        return false
    }
    return true
}

async function doTask(index, authorization, unionid) {
    $.unionid = unionid
    http = axios.create({
        headers: {
            "Host": "mystore-01api.watsonsvip.com.cn",
            "Connection": "keep-alive",
            "authorization": "Bearer "+authorization,
            "charset": "utf-8",
            "miniprogramversion": "1.0.0",
            "unionid": unionid,
            "openid": "o_DpX46s3Qe3nN-1PN2GEvr9gBRw",
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; IN2020 Build/RP1A.201005.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.99 XWEB/4375 MMWEBSDK/20221206 Mobile Safari/537.36 MMWEBID/7989 MicroMessenger/8.0.32.2300(0x28002055) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android",
            "content-type": "application/json",
            "authorizer-appid": "wx1ffbd6927043dff7",
            "Accept-Encoding": "gzip,compress,br,deflate",
            "Referer": "https://servicewechat.com/wx1ffbd6927043dff7/489/page-frame.html"
        }
    })
    console.log(`\n\n账号【${index}】签到`)
    let isSign = await sign()
    if (!isSign) {
        throw `账号【${index}】异常=>${$.signResult}`
    }
    const list = await getTaskList()
    for (let index = 0; index < list.length; index++) {
        const element = list[index];
        if (element.state == 0) {
            console.log(`账号【${index}】开始任务【${element.name}】等待${element.leastWaitForSeconds}秒`)
            if (element.type == "Jump" || element.type == "Subscribe") {
                await submission({ "taskId": element.id })
                await wait(1100)
                continue;
            }
            const taskToken = await getTaskToken(element.id)
            if (taskToken == false) continue;
            await wait(element.leastWaitForSeconds * 1100)
            await submission({ "taskId": element.id, "completeBrowserTaskToken": taskToken })
        }
    }
    const newList = await getTaskList()
    console.log(`\n开始账号【${index}】领取任务奖励`)
    for (let index = 0; index < newList.length; index++) {
        const element = newList[index];
        if (element.prizeReceiveStatus == 0) {
            const error = await receiveTaskReturn(element.prizeId)
            if (error) console.log(`账号【${index}】领取【${element.name}】任务奖励=> ${element.prize * 0.01}回馈金`)
            await wait(2000)
        }
    }
    console.log(`账号【${index}】任务完成`)
}
let CookieQCS = [
]
if (process.env.QCS_COOKIE) {
    if (process.env.QCS_COOKIE.indexOf('&') > -1) {
        CookieQCS = process.env.QCS_COOKIE.split('&');
    } else if (process.env.QCS_COOKIE.indexOf('\n') > -1) {
        CookieQCS = process.env.QCS_COOKIE.split('\n');
    } else {
        CookieQCS = [process.env.QCS_COOKIE];
    }
}
CookieQCS = [...new Set(CookieQCS.filter(item => !!item))]
console.log(`\n====================共${CookieQCS.length}个屈臣氏账号Cookie=========\n`);
console.log(`==================脚本执行- 北京时间(UTC+8)：${new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000).toLocaleString('zh', { hour12: false }).replace(' 24:', ' 00:')}=====================\n`)
!(async () => {
    await wait(500)
    for (let index = 0; index < CookieQCS.length; index++) {
        const userCookies = JSON.parse(CookieQCS[index]);
        try {
            await doTask(index + 1, userCookies.authorization, userCookies.unionid)
        } catch (error) {
            console.error(error)
        }
    }
})()
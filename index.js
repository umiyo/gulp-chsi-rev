"use strict";
/**
 * @description 文件版本号输出方式；截取字符串，避免出现多个版本号叠加；修改远程链接版本号，如果已存在则替换；
 * @modify      huanghui8030@qq.com, bert1100@126.com
 * @date        20161226  
 * @modify      v1.2.0 20190528 每次更改时，用同一个时间戳。以及注释的删除
 */
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var colors = require('colors');

var gutil = require('gulp-util');
var through = require('through2');

var PLUGIN_NAME = 'gulp-chsi-rev';

var ASSET_REG = {
    // 暂停以下解析，加快gulp处理less文件速度
    // "SCRIPT": /(<script[^>]+src=)['"]([^'"]+)["']/ig,
    // "script-path": /(<script[^>]+path=)['"]([^'"]+)["']/ig,
    // "STYLESHEET": /(<link[^>]+href=)['"]([^'"]+)["']/ig,
    // "style-path": /(<link[^>]+path=)['"]([^'"]+)["']/ig,

    "CSS": /(['"])([^\s'"].*?)\1/ig, // 修改在css中的探测内容 20190527 weij
    // "IMAGE": /(<img[^>]+src=)['"]([^'"]+)["']/ig,
    // "BACKGROUND": /(url\()(?!data:|about:)([^)]*)/ig,
    "dynamic-loading": /(<script>[^>]+addFile[(]['"]{css||js}['"][,])(['"])([^\s'"].*?)\2/ig   //js动态加载的内容 20170306 huanghui 
};

var createHash = function (file, len) {
    return crypto.createHash('md5').update(file).digest('hex').substr(0, len);
};


//获取当前时间
var getDate = new Date().getTime();
console.log('当前时间戳为：'+getDate);
console.log(colors.red.bold('提醒：按照css规范和xss安全策略要求，在css/less中写的url()中资源路径须加引号，否则不予转换！'));
module.exports = function (options) {
    return through.obj(function (file, enc, cb) {
     
        options = options || {};

        if (file.isNull()) {
            this.push(file);
            return cb();
        }

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return cb();
        }

        var content = file.contents.toString();

        var filePath = path.dirname(file.path);

        for (var type in ASSET_REG) {
            if (type === "BACKGROUND" && !/\.(css|scss|less)$/.test(file.path)) {
            } else {
                content = content.replace(ASSET_REG[type], function (str, tag, src) {  
                    // 过滤目标对象
                    if (!/[^\\]\.[^\.]+$/.test(src)) {
                        return str;
                    }

                    // 排除.js，.html 静态资源（根据公司cdn设置规则）
                    if(/.+\.(js|html)$/g.test(src)){
                        return str;
                    }
                    // 排除cdn的common目录下的静态资源
                    if(/t\d.ch[de]i.com.cn\/common\/.+/g.test(src)){
                        return str;
                    }

                    // console.log('匹配该模式的字符串：' + str + '\n')
                    // console.log('匹配的第1个括号的内容：' + tag + '\n')
                    // console.log('匹配的第2个括号的内容：' + src + '\n')
                  
                    src = src.trim(); //去掉空格

                    //解决已有版本号重复多次加载的问题(处理旧版号)
                    if(src.indexOf('?')>-1){
                        src =  src.replace(/([\?\&]v=)([^&]+)/g, '$1'+getDate);
                    }else{
                        src = src+'?v='+ getDate;; // 直接加版本号
                    }

                    return tag + src + tag;
                });
            }
        }

        // 鉴于安全性，不再使用 new Buffer(content)
        file.contents = Buffer.from(content);
        this.push(file);
        cb();
    });
};


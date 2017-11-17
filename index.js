'use strict'
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const lambdaAudio = require('lambda-audio');
const fs = require('fs');
const url = require('url');
const tempFile = './temp.wav';
const outFile = './out.mp3';

let options = (postData) => {
  return {
    host: 'api.voicetext.jp',
    port: 443,
    path: '/v1/tts',
    method: 'POST',
    auth: process.env.HOYA_AUTH,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };
}

let convert = (input, output, response) => {
  lambdaAudio.sox(input + ' -c 2 ' + output)
    .then(res => {
      console.log('converted!');
      const stat = fs.statSync(output);
      response.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        // 'Content-Type': 'audio/wav',
        'Content-Length': stat.size
      });
      fs.createReadStream(output).pipe(response);
    })
    .catch(errorResponse => {
      console.log('Error from the sox command:', errorResponse);
    });
}

let action = (text, response) => {
  const postData = querystring.stringify({
    text: text,
    speaker: 'hikari'
  });
  console.log('postData = ', postData);
  console.log('postData.length = ', postData.length);
  let req = https.request(options(postData), (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    res.setEncoding('binary');
    let data = [];
    res.on('data', (d) => {
      data.push(new Buffer(d, 'binary'));
    });
    res.on('end', () => {
      let body = Buffer.concat(data);
      fs.writeFile(tempFile, body, (err) => {
        convert(tempFile, outFile, response);
      });
    });
  });
  req.write(postData);
  req.end();
}

let decNumRefToString = (decNumRef) => {
	return decNumRef.replace(/&#(\d+);/ig, (match, $1, idx, all) => {
		return String.fromCharCode($1);
	});
}

http.createServer((request, response) => {
  console.log(request.url);
  const text = decNumRefToString(url.parse(request.url, true).query.text);
  console.log(text);
  action(text, response);
}).listen(5000);

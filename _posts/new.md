---
layout:     post
title:      Node.js
subtitle:   Node.js之Guide(2)：HTTP业务的剖析
date:       2017-09-06
author:     gezichenshan
header-img: img/post-bg-ios9-web.jpg
catalog: true
tags:
    - Nodejs
---
Anatomy of an HTTP Transaction(https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)

本教程的目的在于传授对Node.js处理HTTP进程的扎实的理解。在不考虑编程语言和编程环境的情况下，我们假设你大体上了解HTTP请求是怎么工作的，同样也假设你了解nodejs的 [EventEmitters](https://nodejs.org/api/events.html)(事件发射器) 和 [Streams](https://nodejs.org/api/stream.html)(流)是怎么一回事。如果你不太了解它们，那请你先快速阅读一下它们的API文档。

##创建一个服务

任何node的web服务应用在某种情况下都必须创建一个web服务对象(server object)。这个对象通过 [createServer](https://nodejs.org/api/http.html#http_http_createserver_requestlistener)创建。
```
const http = require('http');

const server = http.createServer((request, response) => {
  // magic happens here!
});
```
这个传到[createServer](https://nodejs.org/api/http.html#http_http_createserver_requestlistener) 里的方法(function)，在每一次接收针对这个服务发送的HTTP请求时，都会被调用一次，因此我们称这个方法为请求处理者(request handler)。这个由[createServer](https://nodejs.org/api/http.html#http_http_createserver_requestlistener)返回的[服务对象](https://nodejs.org/api/http.html#http_class_http_server)实际上就是个 [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter)，它是创建服务对象的简写方式，之后加了一个监听器(listener)。
```
const server = http.createServer();
server.on('request', (request, response) => {
  // the same kind of magic happens here!
});
```

当一个HTTP请求到达这个服务时，node就会调用这个请求处理者方法并用一系列便于使用的对象去处理这次业务(transaction)、请求(request)，和回应(respose)。我们稍后会谈到它们。

为了服务请求，服务对象上的[listen](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)方法需要被调用。在多数情况下，你只需要将你想要监听的端口数字传给listen方法即可。不过这里也有其他参数选项，请参考[API reference](https://nodejs.org/api/http.html)。

###方法，URL和头(Method, URL and Headers)
当我们处理一个请求时，我们往往首先会看这个请求的方法和URL，以此来找寻合适的动作(actions)处理它。Node在请求对象上(request object)上加了一些便于使用的属性，让我们处理起来相对轻松一些。
```
const { method, url } = request;
```
**注意**：这里的request是[IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)的实例.

这里的method通常是HTTP的方法/动词(method/verb)。这个url是不包含服务、协议、端口的完整URL地址。一个典型的URL，即从包括第三条正斜线以内的后面所有部分(译者按：假设一段地址是，http://www.jianshu.com/writer#/notebooks/16260155/notes/16769868/preview，典型URL应该就指/writer#/notebooks/16260155/notes/16769868/preview这部分)。

头(Headers)则在request一个属性名叫headers的对象里。

```
const { headers } = request;
const userAgent = headers['user-agent'];
```

这里需要强调的是，无论客户端如何发送头部信息，所有的头都以小写形式呈现，这简化了解析头部信息的工作。

如果头部信息重复，那么它们的值会被重写，或者组合成以逗号相隔的字符串。在一些情况下，这可能会导致问题，所以也可以传入[rawHeaders](https://nodejs.org/api/http.html#http_message_rawheaders)。

###请求主体(Request Body)
当我们接受到一个POST或PUT请求，请求主体对我们的应用来说就至关重要了。获取请求主体的数据比获取请求头更麻烦。传入处理程序的请求对象经过了[ReadableStream](https://nodejs.org/api/stream.html#stream_class_stream_readable)的接口。我们可以监听这个流，或者将它向其他流一样传到其他地方去。通过监听流的'data'和'end'事件，我们可以抓到这个流的数据。

每一个'data'事件由释放出来的块都是一个缓存([Buffer](https://nodejs.org/api/buffer.html))。如果这个缓存以字符串形式存在，那么最好先将其转化成数组形式，然后在end事件里再将其字符串化。

```
let body = [];
request.on('data', (chunk) => {
  body.push(chunk);
}).on('end', () => {
  body = Buffer.concat(body).toString();
  // at this point, `body` has the entire request body stored in it as a string
});
```
**注意**：在多数情况下，这样做看起来很繁琐。幸运的是，在 [npm](https://www.npmjs.com/) 上，我们有很多像[concat-stream](https://www.npmjs.com/package/concat-stream)和 [body](https://www.npmjs.com/package/body) 一样的组件，它们可以帮助我们简化一些这样的繁琐逻辑。
在继续探索之前，对事情怎么发生的有一个好的理解很重要，这也是你走到这里的原因！

###关于错误的一件小事(errors)

因为请求对象(request object)是一个可读的流([ReadableStream](https://nodejs.org/api/stream.html#stream_class_stream_readable))，同时也是事件发射器([EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter))，当一个错误发生时，它们的表现一样。请求流的错误通过发送'error'事件表现出来。**如果你没有监听这个事件，这个错误将会被thrown掉，这会导致Node.js程序崩溃。**因此，即使你记录了这个错误并让程序继续跑，你也需要在这个请求流上加一个'错误'监听器。（最好是发送类似HTTP error response的响应。我们一会再讲。 ）

###到目前为止，我们收获了什么
到目前为止，我们创建了一个服务，知道了方法(method)、URL、头(headers)和请求主体(body out of requests)。当我们将它们放到一块，将会得到以下东西：
```
const http = require('http');

http.createServer((request, response) => {
    const { headers, method, url } = request;
    let body = [];
    request.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        // At this point, we have the headers, method, url and body, and can now
        // do whatever we need to in order to respond to this request.
    });
}).listen(8080); // Activates this server, listening on port 8080.
```

如果我们运行这个例子，我们将能获得请求(requests)，但是却没有回应(respond)。实际上，如果你在网页上跑这个例子，我的请求将超时，没有东西返回给客户端。

到目前为止，我们还没碰过响应对象(response object)，响应对象是 [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)的一个实例，同时也是一个可写的流 [WritableStream](https://nodejs.org/api/stream.html#stream_class_stream_writable)。它包含了很多很有用的方法，以此发回数据给客户端。我们接下来谈论response。

###HTTP Status Code

如果你不清楚怎么设置它，记住HTTP response里的 status code 通常都是200。当然，也不是所有HTTP response都是200，而且有些时候你也要用到其他status code值。因此，你需要设置statusCode属性。
```
response.statusCode = 404; // Tell the client that the resource wasn't found.
```
我们也可以通过其他捷径设置statusCode，下面来看一看。

###设置响应头(response headers)。
通过[setHeader](https://nodejs.org/api/http.html#http_response_setheader_name_value)方法，我们可以很方便的设置头信息。
```
response.setHeader('Content-Type', 'application/json');
response.setHeader('X-Powered-By', 'bacon');
```
大小写对响应头的设置没影响，如果你重复设置了一个头，只有最后一句代码生效。
###显示地发送头部数据

我们假设你用我们上述“隐式的头”的方式来设置头和status code。也就是说，在你发送数据体(body data)前，你依靠node帮助你去发送头部信息。

如果你想，你也可以*显式地*将头部信息写入响应流里。你可以通过 [writeHead](https://nodejs.org/api/http.html#http_response_writehead_statuscode_statusmessage_headers)方法达到此目的(写入status code 和 headers到流里)。
```
response.writeHead(200, {
  'Content-Type': 'application/json',
  'X-Powered-By': 'bacon'
});
```

当你设置好头后（无论是显式地还是隐式地），你就可以开始发送响应数据了。

###发送响应体(Response Body)
因为响应对象是一个可写的流( [WritableStream](https://nodejs.org/api/stream.html#stream_class_stream_writable))，我们可以用常规的流方法，写一个响应体发送给客户端。

```
response.write('<html>');
response.write('<body>');
response.write('<h1>Hello, World!</h1>');
response.write('</body>');
response.write('</html>');
response.end();
```
The end function on streams can also take in some optional data to send as the last bit of data on the stream, so we can simplify the example above as follows.
在上面代码的end方法里，我们也可以写一点数据进去，所以上诉代码可以简化成：
```
response.end('<html><body><h1>Hello, World!</h1></body></html>');
```

 **注意：**在向响应体写数据块之前，状态（status）和头（headers）的设置非常重要。为什么这么说，因为在HTTP响应里，响应头都是先于响应体的。

###关于错误的另一件小事
响应流同样能发送“error”事件，某些情况下你必须要处理这个错误。对请求流里的错误处理建议也适用于此。

###将这些组合到一起
Now that we've learned about making HTTP responses, let's put it all together. Building on the earlier example, we're going to make a server that sends back all of the data that was sent to us by the user. We'll format that data as JSON using JSON.stringify.
至此，我们学习了如何生成HTTP响应，让我们合起来看一起。在之前的例子的基础上，我们加这样一个服务，它将用户发给我们的数据又发回给用户。我们用JSON.stringify将数据JSON化：
```
const http = require('http');

http.createServer((request, response) => {
  const { headers, method, url } = request;
  let body = [];
  request.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    // BEGINNING OF NEW STUFF

    response.on('error', (err) => {
      console.error(err);
    });

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    // Note: the 2 lines above could be replaced with this next one:
    // response.writeHead(200, {'Content-Type': 'application/json'})

    const responseBody = { headers, method, url, body };

    response.write(JSON.stringify(responseBody));
    response.end();
    // Note: the 2 lines above could be replaced with this next one:
    // response.end(JSON.stringify(responseBody))

    // END OF NEW STUFF
  });
}).listen(8080);
```
###一个回显服务端的例子

将上一个例子简化成一个简单的回显服务，它把任何接收的数据原封不动地发回。我们要做的就是从请求流里的数据抓取出来，然后将其写入响应流里，就像我们之前做过的一样。
```
const http = require('http');

http.createServer((request, response) => {
  let body = [];
  request.on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    response.end(body);
  });
}).listen(8080);
```

调整一下，让服务端只在以下条件下才返回数据：
- The request method is GET.
- The URL is /echo.

在别的情况下，我们只返回404。

```
const http = require('http');

http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/echo') {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      response.end(body);
    });
  } else {
    response.statusCode = 404;
    response.end();
  }
}).listen(8080);
```

**注意：**为了检查URL，我们用了“路由(routing)”的形式。就路由而言，有简单地转换的路由，也有复杂的如[express](https://www.npmjs.com/package/express)一样框架式的路由。如果你只关心路由，那么用 [router](https://www.npmjs.com/package/router)就可以了。



非常好！现在让我们尝试简化它。还记得吗，之前说过请求对象是一个可读流[ReadableStream](https://nodejs.org/api/stream.html#stream_class_stream_readable)，响应对象是一个可写流 [WritableStream](https://nodejs.org/api/stream.html#stream_class_stream_writable),这意味着我们能用管道([pipe](https://nodejs.org/api/stream.html#stream_readable_pipe_destination_options))直接将数据从一个传给另一个。这就是所谓回显服务要做的事。
```
const http = require('http');

http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/echo') {
    request.pipe(response);
  } else {
    response.statusCode = 404;
    response.end();
  }
}).listen(8080);
```

厉害了，我的流！

还没完。就像这份指南多次提到的，我们还得应付错误发生时的情况。

对请求流上的错误，我们把错误记录到`标准出错文件`(stderr)里，发送错误码400标明这个一个`Bad Request`。在现实世界的应用中，我们检查错误，去分析正确的状态码和信息应该是什么。关于错误，你可以读一读[`Error` documentation](https://nodejs.org/api/errors.html)。

对于响应错误，我们将其记录到`标准输出文件`(stdout)里。

```
const http = require('http');

http.createServer((request, response) => {
  request.on('error', (err) => {
    console.error(err);
    response.statusCode = 400;
    response.end();
  });
  response.on('error', (err) => {
    console.error(err);
  });
  if (request.method === 'GET' && request.url === '/echo') {
    request.pipe(response);
  } else {
    response.statusCode = 404;
    response.end();
  }
}).listen(8080);
```
到目前为止，我们讲解了处理HTTP请求的基本方法。现在你能够做以下事情了：
- 用请求处理函数(request handler function)创建一个HTTP服务的实例，并监听其端口。
- 从请求对象里得到头部信息(headers)、URL、方法(method)及数据体(body data)。根据URL 和/或 请求对象里的其他数据决定路由。
- 通过响应对象返回头部信息、HTTP状态码以及数据体。
- 将数据通过流的形式从请求对象传到响应对象。
- 处理请求流和响应流里的错误。

From these basics, Node.js HTTP servers for many typical use cases can be constructed. There are plenty of other things these APIs provide, so be sure to read through the API docs for [EventEmitters
](https://nodejs.org/api/events.html), [Streams
](https://nodejs.org/api/stream.html), and [HTTP
](https://nodejs.org/api/http.html).
通过这些基础，我们可以建立许多基于Node.js的HTTP典型服务。上述API还能提供许多其他功能，所以请通读一下关于[EventEmitters](https://nodejs.org/api/events.html), [Streams](https://nodejs.org/api/stream.html), 和 [HTTP](https://nodejs.org/api/http.html)的API文档。

# jQuery Paginated Dropdown Widget

This widget takes a JSON response from the server and converts it into a paginated drop down. It has features like pagination (pretty obvious), custom templates, JSON filtering, keyboard navigations,
value property selection, state persistence (statefulness) and more.

It has dependencies on jQuery-1.6+, jQuery UI Widget Factory 1.8+ and jQuery filterJSON plugin (also developed by me). The filterJSON plugin is a utility which allows you to filter the JSON 
based on properties. You can explore filterJSON under my repositories. However, using filterJSON plugin is not mandatory and can be completely ignored.
			
This Widget supports IE7+, FF 3.6+, Opera 12+, Safari 5+ and Chrome

### Known Issues

For this Widget to work in IE7 and below with filterJSON property set as true, you will have to include JSON2.

You can use: http://ajax.cdnjs.com/ajax/libs/json2/20110223/json2.js

### Licence

Copyright (c) 2012 Kapil Kashyap.
Dual licensed under MIT License and GPL License.
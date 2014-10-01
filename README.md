Short Story:
* I wanted to use iScroll with jQuery Mobile and needed to replace an existing pull-to-refresh utility
* iScroll4 had a pull-to-refresh option as well as a widget compatible with jQuery Mobile in another GitHub repo
* Folks over here: https://github.com/watusi/jquery-mobile-iscrollview/issues/118 was looking for an iScroll 5 implementation - no one had done it yet aside from some jsFiddle examples
* Folks over here: https://github.com/cubiq/iscroll/issues/378 were looking for a pull-to-refresh implementation with iScroll 5
* I combined sources from both places and specifically inspiration from https://github.com/orenagiv and http://pnc.co.il/dev/iscroll-5-pull-to-refresh-and-infinite-demo.html to put together what I have in this repo

Tested On:
* iPad Mini
* Nexus 7
* Moto X
* Chrome Browser - OS X
* Safari Browser - OS X

Supported:
* Orientation Change

Known Issues:
* iPhone for  iOS 7 & 8 - scrolling of just the jQM page content without scrolling the entire body of the document (which is required to make iscroll work properly) does not cause the address bar and button bar on mobile safari to go away.  This SO article has more details: http://stackoverflow.com/questions/18793072/impossible-to-hide-navigation-bars-in-safari-ios-7-for-iphone-ipod-touch

Going Forward:
* Please submit PR's as I plan to be actively engaged in maintaining this since I have a personal stake in its success.
* Let me know of your problems but PLEASE create a jsFiddle or host a site somewhere to reproduce your issue.
* Enjoy the fruits of some significant labor. :-)
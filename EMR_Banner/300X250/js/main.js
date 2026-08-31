"use strict";
var LTApp = function () {
    this.INITED = !1
};

function AppBanner() {
    return void 0 !== AppBanner.instance || (AppBanner.instance = this, LTApp.call(this)), AppBanner.instance
}

function iDsToVars() {
    for (var n = document.getElementsByTagName("id"), e = 0; e < n.length; e++) {
        var t = n[e];
        t.id && (window[t.id] = document.getElementById(t.id))
    }
}
LTApp.prototype = {
    preload: function (n, e) {
        this.sources = n;
        var t, a = 0;
        if ($("*").each(function (n, e) {
                "SCRIPT" !== e.tagName && "feMergeNode" !== e.tagName && this.findImageInElement(e)
            }.bind(this)), 0 === this.sources.length) e.call();
        else if (document.images)
            for (var r = 0; r < this.sources.length; r++)(t = new Image).onload = function () {
                ++a === this.sources.length && e.call()
            }.bind(this), t.src = this.sources[r];
        else e.call()
    },
    determineUrl: function (n) {
        var e, t = "",
            a = n.currentStyle || window.getComputedStyle(n, null);
        return "" !== a.backgroundImage && "none" !== a.backgroundImage || "" !== n.style.backgroundImage && "none" !== n.style.backgroundImage ? -1 === (e = a.backgroundImage || n.style.backgroundImage).indexOf("gradient(") && (t = e.split(",")) : void 0 !== n.getAttribute("src") && "img" === n.nodeName.toLowerCase() && (t = n.getAttribute("src")), [].concat(t)
    },
    findImageInElement: function (n) {
        var e = this.determineUrl(n),
            t = navigator.userAgent.match(/msie/i) || navigator.userAgent.match(/Opera/i) ? "?rand=" + Math.random() : "";
        e.forEach(function (n) {
            "" !== (n = this.stripUrl(n)) && this.sources.push(n + t)
        }.bind(this))
    },
    stripUrl: function (n) {
        return n = (n = (n = (n = (n = $.trim(n)).replace(/url\("/g, "")).replace(/url\(/g, "")).replace(/"\)/g, "")).replace(/\)/g, "")
    }
}, AppBanner.prototype = new LTApp, AppBanner.fn = AppBanner.prototype, AppBanner.getInstance = function () {
    return void 0 === AppBanner.instance && new AppBanner, AppBanner.instance
}, AppBanner.fn.init = function () {
    this.INITED || (this.INITED = !0, this.preload([], this.display.bind(this))), iDsToVars()
}, AppBanner.fn.display = function () {
    $("body").removeClass("loading"), $("body").addClass("loaded"), AppBanner.fn.anima()
};
"use strict";
AppBanner.fn.anima = function () {
    var n = new TimelineMax,
        e = ($(".animation-placeholder"), $(".isi")),
        i = $(".isi-main"),
        t = $(".isi_wrapper"),
        r = $(".contentWrapper"),
        a = 15e4,
        o = null,
        l = 0,
        c = 0,
        s = 0,
        u = !1,
        m = !1,
        p = t.clientHeight;

    function f() {
        p = $(".isi_wrapper").outerHeight(), s = -1 * (e.outerHeight() - p), c = 100 * o.y / s, l = a - a * (c / 100), o.refresh(), setTimeout(function () {
            l = 100000
            100 <= c && (u = !0), o.scrollTo(0, s, l, {
                fn: function (n) {
                    return n
                }
            })
        }, 100)
    }

    function d() {
        o.isAnimating = !1
    }
    window.tl = n, o = new IScroll(".isi_wrapper", {
        scrollbars: "custom",
        interactiveScrollbars: !0,
        resizeScrollbars: !1,
        mouseWheel: !0,
        momentum: !0,
        click: !0,
        disablePointer: !0,
        disableTouch: !1,
        disableMouse: !1
    }), window.myScroll = o, $(".iScrollVerticalScrollbar").mouseenter(function () {
        o.scrollBy(0, 0, 1, {
            fn: function (n) {
                return n
            }
        })
    }), i.mouseenter(function () {
        d();
    }), i.mouseleave(function () {
        m && (u || f())
    }), o.on("scrollStart", function () {
        m && o.isAnimating && d()
    }), o.on("scrollEnd", function () {
        o.maxScrollY >= o.y && (d(), setTimeout(function () {
            o.scrollTo(0, 0, 2e3)
        }, 3e3));
            }),
    n.addLabel("frame1", "+=0").add(function () {
      ((m = !0), f());
    }, "frame1+=2");
};

$(function () {
  AppBanner.getInstance().init();
});

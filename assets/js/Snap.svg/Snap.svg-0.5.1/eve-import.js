/**
 * Bundled by jsDelivr using Rollup v2.79.2 and Terser v5.39.0.
 * Original file: /npm/eve@0.5.1/eve.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var e, n, t, r, f, i, o, l, s, a, u, p, v, c, h, d = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : {},
    g = {
        exports: {}
    }, eve;
e = g, n = d, f = "0.5.0", i = "hasOwnProperty", o = /[\.\/]/, l = /\s*,\s*/, s = function(e, n) {
    return e - n
}, a = {
    n: {}
}, u = function() {
    for (var e = 0, n = this.length; e < n; e++)
        if (void 0 !== this[e]) return this[e]
}, p = function() {
    for (var e = this.length; --e;)
        if (void 0 !== this[e]) return this[e]
}, v = Object.prototype.toString, c = String, h = Array.isArray || function(e) {
    return e instanceof Array || "[object Array]" == v.call(e)
}, eve = function(e, n) {
    var f, i = r,
        o = Array.prototype.slice.call(arguments, 2),
        l = eve.listeners(e),
        a = 0,
        v = [],
        c = {},
        h = [],
        d = t;
    h.firstDefined = u, h.lastDefined = p, t = e, r = 0;
    for (var g = 0, y = l.length; g < y; g++) "zIndex" in l[g] && (v.push(l[g].zIndex), l[g].zIndex < 0 && (c[l[g].zIndex] = l[g]));
    for (v.sort(s); v[a] < 0;)
        if (f = c[v[a++]], h.push(f.apply(n, o)), r) return r = i, h;
    for (g = 0; g < y; g++)
        if ("zIndex" in (f = l[g]))
            if (f.zIndex == v[a]) {
                if (h.push(f.apply(n, o)), r) break;
                do {
                    if ((f = c[v[++a]]) && h.push(f.apply(n, o)), r) break
                } while (f)
            } else c[f.zIndex] = f;
    else if (h.push(f.apply(n, o)), r) break;
    return r = i, t = d, h
}, eve._events = a, eve.listeners = function(e) {
    var n, t, r, f, i, l, s, u, p = h(e) ? e : e.split(o),
        v = a,
        c = [v],
        d = [];
    for (f = 0, i = p.length; f < i; f++) {
        for (u = [], l = 0, s = c.length; l < s; l++)
            for (t = [(v = c[l].n)[p[f]], v["*"]], r = 2; r--;)(n = t[r]) && (u.push(n), d = d.concat(n.f || []));
        c = u
    }
    return d
}, eve.separator = function(e) {
    e ? (e = "[" + (e = c(e).replace(/(?=[\.\^\]\[\-])/g, "\\")) + "]", o = new RegExp(e)) : o = /[\.\/]/
}, eve.on = function(e, n) {
    if ("function" != typeof n) return function() {};
    for (var t = h(e) ? h(e[0]) ? e : [e] : c(e).split(l), r = 0, f = t.length; r < f; r++) ! function(e) {
        for (var t, r = h(e) ? e : c(e).split(o), f = a, i = 0, l = r.length; i < l; i++) f = (f = f.n).hasOwnProperty(r[i]) && f[r[i]] || (f[r[i]] = {
            n: {}
        });
        for (f.f = f.f || [], i = 0, l = f.f.length; i < l; i++)
            if (f.f[i] == n) {
                t = !0;
                break
            }! t && f.f.push(n)
    }(t[r]);
    return function(e) {
        +e == +e && (n.zIndex = +e)
    }
}, eve.f = function(e) {
    var n = [].slice.call(arguments, 1);
    return function() {
        eve.apply(null, [e, null].concat(n).concat([].slice.call(arguments, 0)))
    }
}, eve.stop = function() {
    r = 1
}, eve.nt = function(e) {
    var n = h(t) ? t.join(".") : t;
    return e ? new RegExp("(?:\\.|\\/|^)" + e + "(?:\\.|\\/|$)").test(n) : n
}, eve.nts = function() {
    return h(t) ? t : t.split(o)
}, eve.off = eve.unbind = function(e, n) {
    if (e) {
        var t = h(e) ? h(e[0]) ? e : [e] : c(e).split(l);
        if (t.length > 1)
            for (var r = 0, f = t.length; r < f; r++) eve.off(t[r], n);
        else {
            t = h(e) ? e : c(e).split(o);
            var s, u, p, v, d, g = [a],
                y = [];
            for (r = 0, f = t.length; r < f; r++)
                for (v = 0; v < g.length; v += p.length - 2) {
                    if (p = [v, 1], s = g[v].n, "*" != t[r]) s[t[r]] && (p.push(s[t[r]]), y.unshift({
                        n: s,
                        name: t[r]
                    }));
                    else
                        for (u in s) s[i](u) && (p.push(s[u]), y.unshift({
                            n: s,
                            name: u
                        }));
                    g.splice.apply(g, p)
                }
            for (r = 0, f = g.length; r < f; r++)
                for (s = g[r]; s.n;) {
                    if (n) {
                        if (s.f) {
                            for (v = 0, d = s.f.length; v < d; v++)
                                if (s.f[v] == n) {
                                    s.f.splice(v, 1);
                                    break
                                }! s.f.length && delete s.f
                        }
                        for (u in s.n)
                            if (s.n[i](u) && s.n[u].f) {
                                var x = s.n[u].f;
                                for (v = 0, d = x.length; v < d; v++)
                                    if (x[v] == n) {
                                        x.splice(v, 1);
                                        break
                                    }! x.length && delete s.n[u].f
                            }
                    } else
                        for (u in delete s.f, s.n) s.n[i](u) && s.n[u].f && delete s.n[u].f;
                    s = s.n
                }
            e: for (r = 0, f = y.length; r < f; r++) {
                for (u in (s = y[r]).n[s.name].f) continue e;
                for (u in s.n[s.name].n) continue e;
                delete s.n[s.name]
            }
        }
    } else eve._events = a = {
        n: {}
    }
}, eve.once = function(e, n) {
    var t = function() {
        return eve.off(e, t), n.apply(this, arguments)
    };
    return eve.on(e, t)
}, eve.version = f, eve.toString = function() {
    return "You are running Eve " + f
}, e.exports ? e.exports = eve : n.eve = eve;
var y = g.exports;
export {
    y as
    default
};

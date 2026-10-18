import { expect, it } from "vitest";

import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";

const LOAD =
  'new (require.call.call(require,null,"electron").BrowserWindow)({});';

it.each([
  "class C{method(){}}new C().method.call.call=other;",
  "class C{method=()=>{}}new C().method.call.call=other;",
  "class C{get method(){return ()=>{}}}new C().method.call.call=other;",
  "class C{static get method(){return ()=>{}}static set method(value){}}C.method.call.call=other;",
  "class C{static set method(value){}static get method(){return ()=>{}}}C.method.call.call=other;",
  "class C{get method(){return ()=>{}}set method(value){}}new C().method.call.call=other;",
  "class C{}const value=C.bind(null);value.call.call=other;",
  "class C{static get method(){return ()=>{}}}const value=C.method.bind(null);value.call.call=other;",
  "class B{}class C extends B{}const value=C.bind(null);value.call.call=other;",
  "function C(){return ()=>{}}new C().call.call=other;",
  "class C{method(){}static method={call:{}}}new C().method.call.call=other;",
  "class B{method=()=>{}}class C extends B{get method(){return {call:{}}}}new C().method.call.call=other;",
  "class B{method={call:{}}}class C extends B{method=()=>{}}new C().method.call.call=other;",
  "class C{constructor(){if(flag)return {method:{call:{}}}}method(){}}new C().method.call.call=other;",
])("retains shared helpers selected through class values: %s", (setup) => {
  expect(
    analyzeJavaScriptStaticSource(`${setup}${LOAD}`).electron.browser_windows,
  ).toEqual([]);
});

it.each([
  "class C{method(){}method={call:{}}}new C().method.call.call=other;",
  "class C{constructor(){return {method:{call:{}}}}method(){}}new C().method.call.call=other;",
  "class B{method={call:{}}}class C extends B{method(){}}new C().method.call.call=other;",
  "class B{method=()=>{}}class C extends B{method={call:{}}}new C().method.call.call=other;",
  "class B{static get method(){return ()=>{}}}class C extends B{static set method(value){}}C.method.call.call=other;",
  "class C{static bind(){return {call:{}}}}const value=C.bind(null);value.call.call=other;",
  "class C{static get method(){return {bind(){return {call:{}}}}}}const value=C.method.bind(null);value.call.call=other;",
  "class B{}class C extends B{}C.__proto__.call=other;",
  "function C(){}new C().call.call=other;",
])("keeps noncallable class slots separate: %s", (setup) => {
  expect(
    analyzeJavaScriptStaticSource(`${setup}${LOAD}`).electron.browser_windows,
  ).toHaveLength(1);
});

it.each([
  "class C{static{this.__proto__.call=other}}",
  "class C{static field=(this.__proto__.call=other)}",
  "class C{static #field=(this.__proto__.call=other)}",
  "class C{static{this.call.call=other}}",
  "class C{static field=(this.call.call=other)}",
  "class C{static{(()=>{this.call.call=other})()}}",
  "class C{static field=(()=>{this.call.call=other})()}",
  "class C extends Function{static{this.__proto__.prototype.call=other}}",
])(
  "tracks shared helper writes through static class receivers: %s",
  (setup) => {
    expect(
      analyzeJavaScriptStaticSource(`${setup}${LOAD}`).electron.browser_windows,
    ).toEqual([]);
  },
);

it.each([
  "class C{static call={};static{this.call.call=other}};",
  "class C{static call=function(){};static{this.call.call=other}};",
  "class C{static call={call:{}};static{this.call.call.call=other}};",
  "class C{static call={};static field=(this.call.call=other)};",
  "class C{static call={};static{(()=>{this.call.call=other})()}};",
  "class C{static{this.call.call=other}static call(){}};",
  "class C{static{this.call.call=other}static set call(value){}};",
  "class B{static call={}}class C extends B{static{this.call.call=other}};",
  "class C{static call={}};C.call.call=other;consume(C);",
  "class C{static call={};static{this.call.call=other;consume(this)}};",
  "class C{static call={}};C.__proto__=Function.prototype;C.call.call=other;",
  "class B{static call={}};class C extends B{};C.call.call=other;C.__proto__=Function.prototype;",
  "class C{static{this.call=other}}",
  "class C{static field=(this.call=other)}",
  "class B{}class C extends B{static{this.__proto__.call=other}}",
  "class B{}class C extends B{static field=(this.__proto__.call=other)}",
  "class C{static{this.extra={};this.extra.call=other}}",
])("keeps static receiver own properties separate: %s", (setup) => {
  expect(
    analyzeJavaScriptStaticSource(`${setup}${LOAD}`).electron.browser_windows,
  ).toHaveLength(1);
});

it.each([
  "class C{static{this.call.call=other}static call={}};",
  "class C{static call=(this.call.call=other,{})};",
  "class C{static call={};static{this.call=Function.prototype.call;this.call.call=other}};",
  "class C{static call={};static{Object.defineProperty(this,'call',{value:Function.prototype.call});this.call.call=other}};",
  "class C{static call={}};C.call=Function.prototype.call;C.call.call=other;",
  "class C{static call={}};Object.defineProperty(C,'call',{value:Function.prototype.call});C.call.call=other;",
  "class C{static call={}};consume(C);C.call.call=other;",
  "class C{static call={};static{consume(this);this.call.call=other}};",
  "class C{static call=opaque();static{this.call.call=other}};",
  "class C{static [key]={};static{this.call.call=other}};",
  "class C{@dec static call={};static{this.call.call=other}};",
  "class C{static get call(){return opaque()}static{this.call.call=other}};",
  "class C{static{this.call.call=other}static get call(){return Function.prototype.call}};",
  "class C{static call={call:Function.prototype.call};static{this.call.call.call=other}};",
  "class C{static call={};static{Function.prototype.call.call=other}};",
  "class C{static call={}};const bound=C.bind(null);bound.call.call=other;",
  "var B=class{static call={}};globalThis.B=external;class C extends B{static{this.call.call=other}};",
  "class C extends external{static{this.call.call=other}};",
  "class B{static call={}};B.call=Function.prototype.call;class C extends B{static{this.call.call=other}};",
  "class C{static call={};static{if(flag)consume(this);this.call.call=other}};",
  "class C{static call={};static{defer(()=>{this.call.call=other});consume(this)}};",
  "class B{static call={}};class C extends B{};C.__proto__=Function.prototype;C.call.call=other;",
  "class A{static call={}};class B extends A{};class C extends B{};B.__proto__=Function.prototype;C.call.call=other;",
])("retains uncertain or overwritten static slots: %s", (setup) => {
  expect(
    analyzeJavaScriptStaticSource(`${setup}${LOAD}`).electron.browser_windows,
  ).toEqual([]);
});

it.each([
  "class C extends null{}C.__proto__.call=other;",
  "class C extends null{}const bound=C.bind(null);bound.__proto__.call=other;",
  "class C extends null{static{this.__proto__.call=other}}",
  "class C extends null{static field=(this.__proto__.call=other)}",
])("keeps Function.prototype on a null-heritage constructor: %s", (setup) => {
  expect(
    analyzeJavaScriptStaticSource(`${setup}${LOAD}`).electron.browser_windows,
  ).toEqual([]);
});

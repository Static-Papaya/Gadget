# 在JavaScript中使用重载   
---  

## 引入  
``` js
    import { overload } from './overload.js';
```
## 如何使用  
```
  overload(f): overload; // 无参函数重载
  overload(types..., f): overload; // 有参函数重载
  overload(): polymerization; // 最终生成聚合函数
```  

&emsp;&emsp;overload需要输入一组类型名称，它们分别对应重载函数形参列表，类型名指定后要在末尾设置重载函数。一组重载定义完成后可以接着后面定义新的一组重载，格式也完全一样。当所有的重载都定义完成时需要不传任何值执行一次，该过程会生成一个聚合函数，当我们调用聚合时会根据输入参数的类型自动匹配运行其内部的重载函数。  

```js
    import { overload } from './overload.js';

    const add = overload('number', 'number', function(a, b) {
        return a + b;
    })('string', 'string', function(a, b) {
        return Number(a) + Number(b);
    })();

    add(1, 2); // 3
    add('1', '2'); // 3
```  

&emsp;&emsp;如果我们在指定参数类型时需要用到自定义对象，您可以像下面这样进行定义。  

``` js
    import { overload } from './overload.js';

    function PNumber(value) {
        this.value = value
    } // 用class定义也可以。

    const add = overload(PNumber, PNumber, function(a, b) {
        return a.value + b.value;
    })();

    const sub = overload('PNumber', 'PNumber', function(a, b) {
        return a.value - b.value;
    })();

    add(new PNumber(1), new PNumber(2)); // 3
    sub(new PNumber(1), new PNumber(2)); // -1
```  

&emsp;&emsp;需要注意的是有时候我们很容易将Number、String这样函数当成类型直接传入，overload内部会将他们解析为'Function'，当被错误引导的我们调用它们的时候一个错误就产生了。  

&emsp;&emsp;上面这些可以明确知道每个类型参数的个数，这种类型的重载我称它匹配重载。有时候一些参数可能不固定，面对这种情况我们将使用autoLength来包装参数类型。一旦参数列表中有一个使用了autoLength包装，那么这个重载将变为通项重载。  

``` js
    import { overload, autoLength } from './overload.js';

    const add = overload(autoLength('number'), function(...values) {
        return values.reduce((total, v) => total + v, 0);
    })();

    add(1, 2, 3, 4); // 10
    add(5, 6, 7); // 18

    const sub = overload(autoLength('string'), autoLength('number'), function(...values) {
            return values.reduce((total, v) => total - v, 0);
    })();

    sub('1', '2', 3, 4); // -10
    sub('5', 6, 7); // -18
```

## 细节  

&emsp;&emsp;匹配重载即每一个类型都匹配上才会执行相应的重载函数。而通项重载则是一个不确定长度的重载，一定范围内只要输入的参数类型不发生改变那么就会匹配，当所有条件满足的时候执行相应的重载函数。  

&emsp;&emsp;当我们调用聚合函数的时候，overload会优先按照匹配重载的规则寻找符合条件的函数并执行。如果没有找到就会按照通项重载的规则查找相应的重载函数并执行。如果前两个都没有找到就会报错。  

&emsp;&emsp;通过上面的解释我们会发现优先级：匹配重载 > 通项重载。没错，所以我们在通过它们进行编码时应当注意如果可以确定每个参数长度的尽量用匹配重载，不当的使用通项重载会产生冗余的运算。  

&emsp;&emsp;当然有一种情形除外，如果我们输入的参数个数大于了匹配重载最长的参数个数，那么overload会直接按照通项重载来寻找重载函数。

## 如果不知道类型怎么办?  

&emsp;&emsp;一些基础类型您可以使用`typeof`来查询它们。如果是对象类型您可以直接传入它们或者调用`XXX.name`(如果有的话)。下面是一些常见的参数类型列表。  

| 类型      | 输入                 |                                 样本 |
| :-------- | -------------------- | -----------------------------------: |
| null      | null                 |                               `null` |
| undefined | void 0或'undefined'  |                          `undefined` |
| bool      | 'boolean'            |                       `true`,`false` |
| number    | 'number'             |                 `1`,`NaN`,`Infinity` |
| string    | 'string'             |                                `'1'` |
| function  | Function或'Function' | `Number`,`String`, `function A() {}` |
| symbol    | 'symbol'             |                          `Symbol(1)` |
| bigint    | 'bigint'             |                                 `1n` |
| array     | Array或'Array'       |              `[1,2,3]`,`new Array()` |

# 在JavaScript中使用重载   
### Version 0.3.0
---  

#### 2023.9.24 0.3.0 更新 
1. 新增`typeNone`钩子。[详情](#type_none_add)  
2. `autoLength`钩子支持一次性定义多个类型。[详情](#auto_length_update)  
3. 修复了jsdoc部分错误。  

#### 2023.9.20 0.2.2 更新 
1. 修复Bug.  

#### 2023.9.12 0.2.1 更新  
1. 废弃 自定义对象类型时通过对象构造器名称来指定重载。[详情](#overload_define_discard)
2. 更改 类型'Function' 更改为 'function'; undefined 移除'undefined'; Array 移除 'Array'.
3. 新增 类型Object , Promise, RegExp 等。

---
## 如何使用
#### 基础功能

```
  overload(f): overload; // 无参函数重载
  overload(types..., f): overload; // 有参函数重载
  overload(): polymerization; // 最终生成聚合函数
```  

&emsp;&emsp;overload需要输入一组类型名称，它们分别对应重载函数形参列表，类型名指定后要在末尾设置重载函数。一组重载定义完成后可以接着后面定义新的一组重载，格式也完全一样。当所有的重载都定义完成时需要不传任何值执行一次，该过程会生成一个聚合函数，当我们调用聚合函数时会根据输入参数的类型自动匹配运行其内部的重载函数。  

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

<p id="overload_define_discard"></p> 

<h5>
注：在以往的版本中，您可以通过传入对象名来定义重载参数，但由于这种方式存在很多不确定性，面对不同模块中同名的构造器时就会产生歧义，因此目前已不再支持这种方式定义参数。
</h5>

``` js
    import { overload } from './overload.js';

    function PNumber(value) {
        this.value = value
    } // 用class定义也可以。

    const add = overload(PNumber, PNumber, function(a, b) {
        return a.value + b.value;
    })();

    add(new PNumber(1), new PNumber(2)); // 3

    /* 已废弃 */
    // const sub = overload('PNumber', 'PNumber', function(a, b) {
    //     return a.value - b.value;
    // })();
    // sub(new PNumber(1), new PNumber(2)); -1
```  

&emsp;&emsp;需要注意的是有时候我们很容易将Number、String这样函数误当成类型直接传入，~~overload内部会将他们解析为Function构造器，当被错误引导的我们调用它们时一个错误就产生了。~~ (请参考对象类型内部机制) 请使用'number', 'string' 等样式字符串来指定基本数据类型，您也可以参考文档最后的类型表。

<details>
    <summary>对象类型内部机制</summary>
    <p>&emsp;&emsp;以前的版本中，在指定对象类型重载参数的时候，overload会直接使用xxx.name属性(字符串类型)作为key保存在映射表中，因此在我们调用聚合函数的时候如果传入了一个实例化的对象，就会调用xxx.constructor.name来和映射表中的各种key进行匹配，对于没有constructor.name的情况会使用'object'字符串和映射表匹配。因此大多数情况下，实例化对象的constructor和重载定义的构造器名称只要一致就会发生匹配，对于不同模块如果出现同名类型作为重载参数时，就会出现指定不明。</p>
    <p>&emsp;&emsp;现在版本，引入WeakMap(不兼容的情况下使用链表结构)通过储存原对象的弱引用实现参数类型的映射，在重载定义阶段，overload会对传入的值进行一次typeof，所得结果如果为'string'则会使用传入的值作为永久映射，其余的情况如果传入的值为`undefined`、`null`、`0`则会使用typeof结果作为永久映射，否则使用传入值(类、构造函数)的弱引用放入WeakMap作为映射。调用聚合函数传入实例化对象时，会通过xxx.constructor到WeakMap中寻找映射值。</p>
    <p>&emsp;&emsp;在兼容模式下，使用链表代替WeakMap，因此需要注意在定义阶段，传入的类、构造器都会被作为强引用类型保存下来。</p>
</details>

#### 使用 autoLength 钩子

&emsp;&emsp;上面这些可以明确知道每种类型参数的个数，这种类型的重载我称它匹配重载。有时候一些参数可能不固定，面对这种情况我们将使用autoLength来包装参数类型此时重载就变成了通项重载。只要参数列表中有一个使用了autoLength包装，那么这一条重载都将变为通项重载。  

<p id="auto_length_update"></p>  

``` js
    import { overload, autoLength } from './overload.js';

    // 纯数字
    const add = overload(autoLength('number'), function(...values) {
        return values.reduce((total, v) => total + v, 0);
    })
    // 字符串 + 数字
    (autoLength('string'), autoLength('number'), function(...values) {
        return values.reduce((pre, v) => pre + v, '');
    })
    // 数字 + 字符串。这是一次指定多个类型的写法
    (autoLength('number', 'string'), function(...values) {
        return values.reduce((pre, v) => pre + Number(v), 0);
    })();

    add(1, 2, 3, 4); // 10
    add('1', '2', 3, 4); // '1234'
    add(6, 7, '5'); // 18
```

**注意:** `autoLength`仅用于重载定义阶段，执行阶段直接使用会报错。同时请勿滥用通项重载，复杂的通项重载除了让代码辨识度降低造成逻辑混乱，还可能造成重载覆盖。  

<p id="type_none_add"></p>

<h4>使用 typeNone 钩子</h4>
&emsp;&emsp;假设存在这种情况，可执行函数形参是一个可选参数，如果我们仅传入一个值，如下。  

``` js
    import { overload } from './overload.js';
    const add = overload('number', 'number', (a = 0, b = 1) => a + b)();

    add(1); // error
```  

&emsp;&emsp;那么毫无疑问执行聚合函数的时候会报错。但我们又希望在传入一个值的时候触发该函数，该怎么解决呢?`typeNone`钩子就用于解决这一问题，它就像一个带有类型的undefined，仅用于匹配形参类型但不表示任何值。使用方式如下。  

``` js
    import { overload, typeNone } from './overload.js';
    const add = overload('number', 'number', (a = 0, b = 1) => a + b)();

    add(typeNone('number'), 5); // 0 + 5 = 5
    add(3, typeNone('number')); // 3 + 1 = 4
    add(typeNone('number'), typeNone('number')); // 0 + 1 = 1
```

**注意:** `typeNone`仅用于聚合函数执行阶段，在重载定义阶段直接使用则会报错。

## 细节  
&emsp;&emsp;匹配重载即每一个类型都匹配上才会执行相应的重载函数。而通项重载则是一个不确定长度的重载，一定范围内只要输入的参数类型不发生改变那么就会匹配，当所有条件满足的时候执行相应的重载函数。  

&emsp;&emsp;当我们调用聚合函数的时候，overload会优先按照匹配重载的规则寻找符合条件的函数并执行。如果没有找到就会按照通项重载的规则查找相应的重载函数并执行。如果前两个都没有找到就会报错。  

&emsp;&emsp;通过上面的解释我们会发现优先级：匹配重载 > 通项重载。没错，所以我们在通过它们进行编码时应当注意如果可以确定每个参数长度的尽量用匹配重载，不当的使用通项重载会产生冗余的运算。  

&emsp;&emsp;当然有一种情形除外，如果我们输入的参数个数大于所有匹配重载最长的参数个数，那么overload会直接按照通项重载来寻找重载函数。



## 如果不知道类型怎么办?  

&emsp;&emsp;一些基础类型您可以使用`typeof`来查询它们。如果是对象类型您需要直接传入它们的构造函数。下面是一些常见的参数类型列表。  


| 类型           | 输入       |                                 样本 |
| :------------- | ---------- | -----------------------------------: |
| null           | null       |                               `null` |
| undefined      | void 0     |                          `undefined` |
| bool           | 'boolean'  |                       `true`,`false` |
| number         | 'number'   |                 `1`,`NaN`,`Infinity` |
| string         | 'string'   |                                `'1'` |
| function       | 'function' | `Number`,`String`, `function F() {}` |
| generator      | 'function' |                   `function* G() {}` |
| async function | 'function' |             `async function AF() {}` |
| symbol         | 'symbol'   |                          `Symbol(1)` |
| bigint         | 'bigint'   |                                 `1n` |
| array          | Array      |              `[1,2,3]`,`new Array()` |
| RegExp         | RegExp     |                      `/^[123].txt$/` |
| Object         | Object     |                                 `{}` |
| Promise        | Promise    |                      `new Promise()` |

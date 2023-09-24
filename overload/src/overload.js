/**
 * @file Overload in JavaScript
 * @author Static-Papaya
 * @link https://github.com/Static-Papaya
 * @version 0.3.0
 * @license MIT
 */

/* ==============
**   全局字面量
*/// ============
/** ResultMap 最新下标 */
const $RESULT_MAP_INDEX = Symbol('index');
const $RESULT_MAP_DEFAULT = Symbol('default');
/** ResultMap 长度 */
const $RESULT_MAP_MAX_LENGTH = Symbol('max-args-length');
/** undefined */
const $UNDEFINED = void 0;

/* ==============
**   语义字面量
*/// ============
/** 自适应语义 */
const $SEMANTICS_ADJUST = 'semantics-adjust';
/** 类型无值语义 */
const $SEMANTICS_TYPE_NONE = 'semantics-type-none';

/* ==============
**   全局函数
*/// ============
/**
 * 获取全局对象
 * @returns {globalThis}
 */
function global() {
    if (typeof window !== 'undefined') {
        return window;
    }
    else if (typeof global !== 'undefined') {
        return global;
    }
    else if (typeof self !== 'undefined') {
        return self;
    }
    else {
        return {};
    }
}

/* ==============
**   全局对象
*/// ============
/**
 * ResultMap所使用的储存方式，如果不兼容WeakMap就会使用链表实现。
 */
const _ObjectResultMap = global().WeakMap || (() => {
    /** 
     * 链表子节点
     * @private
     * @typedef {Object} _ObjectResultMapNode
     * @property {_ObjectResultMapNode} _next 链表下一个节点
     * @property {any} instanceKey 相当于WeakMap的key
     * @property {any} value 相当于WeakMap的value
    */
    /**
     * 使用链表代替WeakMap不兼容的情况
     * @constructor
     */
    const ReplaceMap = function () {
        /** @private @type {_ObjectResultMapNode} */
        this._next = $UNDEFINED;
        /** @private @type {_ObjectResultMapNode} */
        this._last = this;
    }

    /**
     * 写入
     * @property {any} instanceKey 相当于WeakMap的key
     * @property {any} value 相当于WeakMap的value
     */
    ReplaceMap.prototype.set = function (instanceKey, value) {
        let target = this[instanceKey];

        if (target === $UNDEFINED) {
            this._last = this._last._next = { instanceKey, value, _next: $UNDEFINED };
        } else {
            target.value = value;
        }
    }

    /**
     * 获取
     * @property {any} instanceKey 相当于WeakMap的key
     * @returns {_ObjectResultMapNode}
     */
    ReplaceMap.prototype.get = function (instanceKey) {
        let target = this._next;

        while (target !== $UNDEFINED) {
            if (target.instanceKey === instanceKey) break;
            target = target._next;
        }

        return target && target.value;
    }

    /**
     * 是否含有该key
     * @property {any} instanceKey 相当于WeakMap的key
     * @returns {boolean}
     */
    ReplaceMap.prototype.has = function (instanceKey) {
        return !!this.get(instanceKey);
    }

    /**
     * 冻结
     */
    ReplaceMap.prototype.freeze = function () {
        let node = this._next;
        while (node) {
            Object.freeze(node);
            node = node._next;
        }
    }

    return ReplaceMap;
})();

/**
 * 语义 - 主要用于一些特殊标识，不同的语义在定义或执行阶段执行不同处理，比如autoLength等。
 * 语义处理的意义是不同类型语义，在定义或执行阶段被特殊处理，用于计算参数的类型，如果在执行阶段可能还会改变传入形参的值。
 * @constructor
 * @param {string} type 语义类型
 * @param {Array<any>} typeList 参数类型
 */
function Semantics(type, typeList) {
    this.type = type;
    this.typeList = typeList;
}

/**
 * 字段映射表
 * @constructor
 * @param {string} [defaultKey='_'] 默认的键名
 * @returns {WeakMap}
 */
const ResultMap = function (defaultKey = '_') {
    /** @type {WeakMap} 对象映射存储器 */
    const map = new _ObjectResultMap();

    /** @type {number} 更新下标 */
    map[$RESULT_MAP_INDEX] = 1;
    /** @type {any} 默认的键名 */
    map[$RESULT_MAP_DEFAULT] = defaultKey;
    /** @type {number} 输入参数最长的长度 */
    map[$RESULT_MAP_MAX_LENGTH] = 0;

    return map;
}

/* ==============
**   语义钩子
*/// ============
/** 
 * 将类型包装成可变参数类型。(定义阶段)
 * 在定义重载函数的时候，通过该函数修饰的类型会让该形参的个数变得可以变化。
 * @param {'number'|'string'|'boolean'|'function'|'symbol'|'bigint'|Array|Promise} targetType 参数类型
 * @returns {Semantics} 可变参数类型语义
 * @example
 * ----------
 * const add = overload(autoLength('number'), function (...numbers) {
 *    let count = 0;
 *    numbers.map(value => count += value);
 *    return count;
 * })()
 * 
 * add(1, 2, 3, 4, 5, 6, 7, 8, 9); // 45
 */
function autoLength(...targetType) {
    const auto = new Semantics($SEMANTICS_ADJUST, targetType);
    Object.freeze(auto);
    return auto;
}

/** 
 * 类型无值(聚合函数使用时)
 * 在聚合函数使用时，如果您希望传入一个带有附属类型的undefined值用于占位，该语义函数正好可以满足这一条件。
 * @param {'number'|'string'|'boolean'|'function'|'symbol'|'bigint'|Array|Promise} targetType 参数类型
 * @returns {Semantics} 类型无值语义
 * @example
 * ----------
 * const add = overload('number', 'number', (a = 2, b) => a + b)()
 * add(typeNone('number'), 1); // 3
*/
function typeNone(targetType) {
    const noneValue = new Semantics($SEMANTICS_TYPE_NONE, [targetType]);
    return noneValue;
}

/* ==============
**   语义处理
*/// ============
/**
 * 定义阶段语义处理
 * @param {Semantics} semantics 语义
 * @param {0|1} isPatch 是否使用匹配映射
 * @returns {[type: any, isPatch: number]} 处理后的类型以及是否使用匹配映射
 */
function handleSemanticsOnDefine(semantics, isPatch) {
    let type;

    switch (semantics.type) {
        case $SEMANTICS_ADJUST: // 自适应语义
            isPatch = 0;
            type = semantics.typeList; break;
        default:
            throw new Error('定义阶段未支持的语义');
    }

    return [type, isPatch];
}

/**
 * 执行阶段语义处理
 * @param {Semantics} semantics 语义
 * @param {any} param 原有参数
 * @return {[type: any, param: any]} 类型, 处理后的参数
 */
function handleSemanticsOnCall(semantics, param) {
    let type;

    switch (semantics.type) {
        case $SEMANTICS_TYPE_NONE: // 类型无值语义
            type = semantics.typeList;
            param = $UNDEFINED; break;
        default: throw new Error('执行了一个未支持的语义');
    }

    return [type, param];
}

/* ==============
**   处理函数
*/// ============
/**
 * 向ResultMap中添加映射.
 * @param {ResultMap} map 类型字段映射表 
 * @param {string|any} key 键名
 * @return {number} 映射值
 */
function setMap(map, key) {
    let index = map[key] || map.get(key);

    // 已经存在
    if (index !== $UNDEFINED) {
        return index;
    }
    // 基本类型
    else if (typeof key === 'string') {
        return map[key] = map[$RESULT_MAP_INDEX]++;
    }
    // 对象
    else {
        return map.set(key, map[$RESULT_MAP_INDEX]++);
    }
};

/**
 * 计算匹配映射结果
 * @param {ResultMap} map 类型字段映射表
 * @param  {string} startChar 开始标识
 * @param  {Array} paramsType 参数类型表
 * @returns {string} 映射值
 */
function calculateResult(map, startChar, paramsType) {
    let max = paramsType.length, index = 0, keys = [startChar];
    let preType = paramsType.pop();
    let type = preType, times = 0;

    while (index++ <= max) {
        if (type !== preType) {
            keys.push(`${map[preType] || map.get(preType)}I${times}`);
            preType = type;
            times = 0;
        }
        type = paramsType.pop();
        times++;
    }

    return keys.join('$');
};

/**
 * 计算通项映射结果
 * @param {ResultMap} map 类型字段映射表
 * @param  {string} startChar 开始标识
 * @param  {Array} paramsType 参数类型表
 * @returns {string} 映射值
 */
function calculateResultAuto(map, startChar, paramsType) {
    let key = [startChar], preType;
    let type = preType, max = paramsType.length, index = 0;

    while (index++ < max) {
        type = paramsType.pop();

        if (type === preType) continue;
        key.push(map[type] || map.get(type));
        preType = type;
    }

    return key.join('$');
};

/** 
 * 将匹配映射转化为通项映射
 * @param {string} mapping 匹配映射结果
 * @returns {string} 通项映射结果
*/
function formatResultToAuto(mapping) {
    return mapping.replace(/I\d/g, '');
}

/**
 * 在重载定义阶段时获取输入的类型.
 * @param {any} type 定义阶段输入的类型
 * @returns {string | any} 类型统一化。
 * 如果输入的typeof = 'string' 输出typeof;
 * 如果输入 = undefined / 0 输出typeof;
 * 其他情况输出输入。
 */
function getTypeOnDefine(type) {
    let resultType = typeof type;

    return resultType === 'string' ? type : type || resultType;
}

/**
 * 设置一个通项重载函数
 * @param {Object} list 匹配参数列表
 * @param {Object} templateList 通项字段映射表
 * @param {ResultMap} map 类型字段映射表
 * @param {Array} options 重载配置项
 */
function setOverloadOnDefine(list, templateList, map, options) {
    const loaderFunction = options.pop();
    let definedType = 1, types = [];

    for (let i = 0, max = options.length, resultType, type; i < max; ++i) {
        type = options[i];
        if (type instanceof Semantics === false) {
            // 获取输入的类型
            resultType = getTypeOnDefine(type);
            types.push(resultType);
            // 写入到映射表
            setMap(map, resultType);
        }
        else {
            // 执行定义阶段语义处理
            [resultType, definedType] = handleSemanticsOnDefine(type, definedType);

            // 对每一个类型进行处理
            for (let resultTypeItem of resultType) {
                // 获取输入的类型
                resultTypeItem = getTypeOnDefine(resultTypeItem);
                types.push(resultTypeItem);
                // 写入到映射表
                setMap(map, resultTypeItem);
            }
        }
    }

    if (definedType) {
        list[calculateResult(map, '_', types)] = loaderFunction;

        // 比较参数最长的长度
        if (map[$RESULT_MAP_MAX_LENGTH] < options.length) {
            map[$RESULT_MAP_MAX_LENGTH] = options.length;
        }
    }
    else {
        templateList[calculateResultAuto(map, '_', types)] = loaderFunction;
    }
}

/* ==========
**   主函数
*/// ========
/**
 * 构造一个函数的重载，依次输入重载函数的类型，然后是执行函数。
 * 该函数使用柯里化执行，可输入多次重载。最后完成重载后需要以空的参数执行一次。
 * 详细可以见下方例子。
 * @param {'number'|'string'|'boolean'|'function'|'symbol'|'bigint'|Array|Promise} options 参数类型, 最后一个参数必须是函数
 * @returns {function} 构造函数的重载/统一执行入口函数
 * @example 
 * ----------
 * const addOne = overload('number', value => value + 1)
 *      ('string', value => Number(value) + 1)();
 * addOne(1); // 2
 * addOne('1'); // 2
 */
function overload(...options) {
    /* 初始化闭包对象 */
    /** 类型映射表 */
    const typesMap = new ResultMap();
    /** 匹配参数列表 */
    const argumentsList = {};
    /** 通项参数列表 */
    const templateList = {};

    return function repeatLoading(...options) {
        /* 继续配置函数重载 */
        if (options.length) {

            // 重载函数写入
            setOverloadOnDefine(argumentsList, templateList, typesMap, options);

            /** 柯里化 */
            return repeatLoading;
        }

        /* 如果重载配置输入为空则表示配置完成 */
        /* 关闭对象 */
        Object.freeze(typesMap)
        typesMap.freeze instanceof Function && typesMap.freeze();
        Object.freeze(argumentsList);
        Object.freeze(templateList);

        /* 返回聚合函数 */
        return function (...args) {
            const paramTypes = [];
            let type, select, index = 0;

            for (const param of arguments) {
                type = typeof param;

                if (type !== 'object' || !(param && param.constructor)) {
                    paramTypes.push(type);
                }
                else if (param instanceof Semantics === false) {
                    paramTypes.push(param.constructor);
                }
                else {
                    [type, args[index]] = handleSemanticsOnCall(param, args[index]);

                    // 类型写入
                    paramTypes.push(type[0]);
                }

                ++index;
            }

            if (args.length <= typesMap[$RESULT_MAP_MAX_LENGTH]) {
                /** @type {string} 计算匹配映射 */
                let key = calculateResult(typesMap, '_', paramTypes);
                /* 选择适合的重载函数 */
                select = argumentsList[key];

                if (select instanceof Function === true) {
                    return select(...args);
                }
                /* 选择可变长重载函数 */
                select = templateList[formatResultToAuto(key)];
            }
            else {
                /* 选择可变长重载函数 */
                select = templateList[calculateResultAuto(typesMap, '_', paramTypes)];
            }

            /* 执行可变长重载函数 */
            if (select instanceof Function === true) {
                return select(...args);
            }
            else {
                throw Error('没有找到合适的重载!');
            }
        }
    }(...options);
}

export {
    overload,
    autoLength,
    typeNone
}

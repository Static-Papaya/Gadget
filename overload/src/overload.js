/**
 * @file Overload in JavaScript
 * @author Static-Papaya
 * @link https://github.com/Static-Papaya
 * @version 0.2.2
 * @license MIT
 */

/*
 * 全局字面量
 */
/** ResultMap 最新下标 */
const $RESULT_MAP_INDEX = Symbol('index');
const $RESULT_MAP_DEFAULT = Symbol('default');
/** ResultMap 长度 */
const $RESULT_MAP_MAX_LENGTH = Symbol('max-args-length');
/** undefined */
const $UNDEFINED = void 0;

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

const _ObjectResultMap = global().WeakMap || class {
    /** 
     * 链表子节点
     * @private
     * @typedef {Object} _ObjectResultMapNode
     * @property {_ObjectResultMapNode} _next 链表下一个节点
     * @property {any} instanceKey 相当于WeakMap的key
     * @property {any} value 相当于WeakMap的value
    */

    /** @private @type {_ObjectResultMapNode} */
    _next = $UNDEFINED;
    /** @private @type {_ObjectResultMapNode} */
    _last = this;

    /**
     * 写入
     * @property {any} instanceKey 相当于WeakMap的key
     * @property {any} value 相当于WeakMap的value
     */
    set(instanceKey, value) {
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
    get(instanceKey) {
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
    has(instanceKey) {
        return !!this.get(instanceKey);
    }

    /**
     * 冻结
     */
    freeze() {
        let node = this._next;
        while (node) {
            Object.freeze(node);
            node = node._next;
        }
    }
};

/**
 * 用于标识可变参数
 */
class AutoLengthType {
    constructor(type) {
        this.type = 'adjust';
        this.typeList = type;
    }
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

/**
 * 向ResultMap中添加映射.
 * @param {ResultMap} map 类型字段映射表 
 * @param {string} key 键名
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
 * @returns {string | any} 类型同一化
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
    let definedType = 1, types;

    types = options.map(type => {
        let resultType;

        if (type instanceof AutoLengthType === false) {
            resultType = getTypeOnDefine(type);
        }
        else {
            definedType = 0;
            resultType = type.typeList;
        }
        // 写入到映射表
        setMap(map, resultType);
        return resultType;
    });

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

/** 
 * 将类型包装成可变参数类型。
 * 在定义重载函数的时候，通过该函数修饰的类型会让该形参的个数变得可以变化。
 * @param {'string'|'number'|'boolean'|'Array'|'Function'|'bigint'|'object'|any} targetType 参数类型
 * @returns {AutoLengthType} 可变参数类型
 * @example
 * ----------
 * let add = overload(autoLength('number'), function (...numbers) {
 *    let count = 0;
 *    numbers.map(value => count += value);
 *    return count;
 * })()
 * 
 * add(1, 2, 3, 4, 5, 6, 7, 8, 9); // 45
 */
function autoLength(targetType) {
    let auto = new AutoLengthType(getTypeOnDefine(targetType));
    Object.freeze(auto);
    return auto;
}

/**
 * 构造一个函数的重载，依次输入重载函数的类型，然后是执行函数。
 * 该函数使用柯里化执行，可输入多次重载。最后完成重载后需要以空的参数执行一次。
 * 详细可以见下方例子。
 * @param  {'string'|'number'|'boolean'|'Array'|'Function'|'bigint'|'object'|any} options 重载项配置，依次输入参数类型，最后一个为该重载执行函数。
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

        /* 返回适配函数 */
        return function (...args) {
            const paramTypes = [];
            let type, select;

            for (const param of arguments) {
                type = typeof param;
                paramTypes.push(
                    type !== 'object' ? type : param && param.constructor || type
                );
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
    autoLength
}

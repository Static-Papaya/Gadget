/**
 * @file Overload in JavaScript
 * @author Static-Papaya
 * @link https://github.com/Static-Papaya
 */

const $RESULT_MAP_INDEX = Symbol('index');
const $RESULT_MAP_DEFAULT = Symbol('default');
const $UNDEFINED = void 0;

class AutoLengthType extends String { }

/**
 * 字段映射表
 * @constructor
 * @param {string} [defaultKey='_'] 默认的键名
 */
function ResultMap(defaultKey = '_') {
    /** @type {number} */
    this[$RESULT_MAP_INDEX] = 0;
    /** @type {any} 默认的键名 */
    this[$RESULT_MAP_DEFAULT] = defaultKey;
    /** @type {number} 输入参数最长的长度 */
    this.maxArgsLength = 0;
}

/**
 * 向ResultMap中添加映射.
 * @param {ResultMap} map 映射对象 
 * @param {string} key 键名
 * @return {number} 映射值
 */
function setMap(map, key) {
    let index = map[key];

    if (index !== $UNDEFINED) return index;

    return map[key] = map[$RESULT_MAP_INDEX]++;
};

/**
 * 计算匹配映射结果
 * @param {ResultMap} map 字段映射表
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
            keys.push(`${map[preType]}I${times}`);
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
 * @param {ResultMap} map 字段映射表
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
        key.push(map[type]);
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
 * @returns {string} 类型同一化
 */
function getTypeOnDefine(type) {
    let resultType = typeof type;

    return resultType === 'string' ? type : (type && type.name) || resultType;
}

/**
 * 设置一个通项重载函数
 * @param {Object} list 字段映射表
 * @param {Object} templateList 通项字段映射表
 * @param {ResultMap} typesMap 匹配参数列表
 * @param {Array} options 重载配置项
 */
function setOverloadOnDefine(list, templateList, typesMap, options) {
    const loaderFunction = options.pop();
    let definedType = 1, types;

    types = options.map(type => {
        let resultType;

        if (type instanceof AutoLengthType === false) {
            resultType = getTypeOnDefine(type);
        } 
        else {
            definedType = 0;
            resultType = type.valueOf();
        }
        // 写入到映射表
        setMap(typesMap, resultType);
        return resultType;
    });

    if (definedType) {
        list[calculateResult(typesMap, '_', types)] = loaderFunction;

        // 比较参数最长的长度
        if (typesMap.maxArgsLength < options.length) {
            typesMap.maxArgsLength = options.length;
        }
    }
    else {
        templateList[calculateResultAuto(typesMap, '_', types)] = loaderFunction;
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
        Object.freeze(typesMap);
        Object.freeze(argumentsList);
        Object.freeze(templateList);

        /* 返回适配函数 */
        return function (...args) {
            const paramTypes = [];

            for (const param of arguments) {
                paramTypes.push(
                    param instanceof Object === true ?
                        param.constructor.name || 'object' : typeof param
                );
            }

            let select;
            
            if (args.length <= typesMap.maxArgsLength) {
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
    autoLength,
    overload
};

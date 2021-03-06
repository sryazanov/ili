'use strict';

function asProps(object, props) {
    props = props || {};
    for (var i in object) {
        props[i] = {
            value: object[i],
            enumerable: true
        };
    }
    return props;
}
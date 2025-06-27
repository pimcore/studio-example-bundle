"use strict";
(self["webpackChunkpimcore_studio_example_bundle"] = self["webpackChunkpimcore_studio_example_bundle"] || []).push([["__federation_expose_default_export"], {
"./js/src/examples/api-data/components/api-data-widget.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ApiDataWidget: () => (ApiDataWidget)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_api_asset__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/api/asset");
/* ESM import */var _pimcore_studio_ui_bundle_api_asset__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_api_asset__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);
/* ESM import */var _pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/modules/app");
/* ESM import */var _pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_4__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

var _s = $RefreshSig$();




const ApiDataWidget = ()=>{
    _s();
    const { isLoading, data, isError, error } = (0,_pimcore_studio_ui_bundle_api_asset__WEBPACK_IMPORTED_MODULE_2__.useAssetGetTreeQuery)({
        page: 1,
        pageSize: 10
    });
    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(()=>{
        if (isError) {
            (0,_pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_4__.trackError)(new _pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_4__.ApiError(error));
        }
    }, [
        isError
    ]);
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        loading: isLoading,
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "API data"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/api-data/components/api-data-widget.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, undefined),
            data === null || data === void 0 ? void 0 : data.items.map((item)=>/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("div", {
                    children: item.filename
                }, item.id, false, {
                    fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/api-data/components/api-data-widget.tsx",
                    lineNumber: 26,
                    columnNumber: 9
                }, undefined))
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/api-data/components/api-data-widget.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, undefined);
};
_s(ApiDataWidget, "jD6PqNyTyyFnk/boH7IOtpd+tj0=", false, function() {
    return [
        _pimcore_studio_ui_bundle_api_asset__WEBPACK_IMPORTED_MODULE_2__.useAssetGetTreeQuery
    ];
});
_c = ApiDataWidget;
var _c;
$RefreshReg$(_c, "ApiDataWidget");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/api-data/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ApiDataPlugin: () => (ApiDataPlugin)
});
/* ESM import */var _modules_api_data_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/api-data/modules/api-data-extension.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

const ApiDataPlugin = {
    name: 'ApiDataPlugin',
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_api_data_extension__WEBPACK_IMPORTED_MODULE_0__.ApiDataExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/api-data/modules/api-data-extension.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ApiDataExtension: () => (ApiDataExtension)
});
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _components_api_data_widget__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./js/src/examples/api-data/components/api-data-widget.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const ApiDataExtension = {
    onInit () {
        const mainNavRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.mainNavRegistry);
        mainNavRegistryService.registerMainNavItem({
            path: 'Example Plugin/Api Data',
            widgetConfig: {
                name: 'Api Data',
                id: 'api-data',
                component: 'api-data-widget',
                config: {
                    icon: {
                        type: 'name',
                        value: 'pimcore'
                    }
                }
            }
        });
        const widgetRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.widgetManager);
        widgetRegistryService.registerWidget({
            name: 'api-data-widget',
            component: _components_api_data_widget__WEBPACK_IMPORTED_MODULE_2__.ApiDataWidget
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/asset-editor-toolbar-button/components/custom-toolbar-button.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  "default": () => (__WEBPACK_DEFAULT_EXPORT__)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var _pimcore_studio_ui_bundle_modules_asset__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/modules/asset");
/* ESM import */var _pimcore_studio_ui_bundle_modules_asset__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_modules_asset__WEBPACK_IMPORTED_MODULE_3__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

var _s = $RefreshSig$();



const CustomToolbarButton = ()=>{
    _s();
    const alertModal = (0,_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__.useAlertModal)();
    const { id } = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(_pimcore_studio_ui_bundle_modules_asset__WEBPACK_IMPORTED_MODULE_3__.AssetContext);
    const { asset } = (0,_pimcore_studio_ui_bundle_modules_asset__WEBPACK_IMPORTED_MODULE_3__.useAssetDraft)(id);
    const onClick = ()=>{
        alertModal.info({
            title: 'Hello!',
            content: 'Hello from the custom toolbar button! The button will only be shown for image assets. Have a nice day!'
        });
    };
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
        children: (asset === null || asset === void 0 ? void 0 : asset.type) === 'image' && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
            onClick: onClick,
            children: "Custom Image Button"
        }, void 0, false, {
            fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/asset-editor-toolbar-button/components/custom-toolbar-button.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, undefined)
    }, void 0, false);
};
_s(CustomToolbarButton, "7hY/oHxje/O4h/qM9LlKDHntaEw=", false, function() {
    return [
        _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__.useAlertModal,
        _pimcore_studio_ui_bundle_modules_asset__WEBPACK_IMPORTED_MODULE_3__.useAssetDraft
    ];
});
_c = CustomToolbarButton;
/* ESM default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CustomToolbarButton);
var _c;
$RefreshReg$(_c, "CustomToolbarButton");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/asset-editor-toolbar-button/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  AssetEditorToolbarButtonPlugin: () => (AssetEditorToolbarButtonPlugin)
});
/* ESM import */var _modules_asset_editor_toolbar_button_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/asset-editor-toolbar-button/modules/asset-editor-toolbar-button-extension.ts");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

const AssetEditorToolbarButtonPlugin = {
    name: 'AssetEditorToolbarButtonPlugin',
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_asset_editor_toolbar_button_extension__WEBPACK_IMPORTED_MODULE_0__.AssetEditorToolbarButtonExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/asset-editor-toolbar-button/modules/asset-editor-toolbar-button-extension.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  AssetEditorToolbarButtonExtension: () => (AssetEditorToolbarButtonExtension)
});
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/modules/app");
/* ESM import */var _pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var _components_custom_toolbar_button__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./js/src/examples/asset-editor-toolbar-button/components/custom-toolbar-button.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");




const AssetEditorToolbarButtonExtension = {
    onInit: ()=>{
        const componentRegistry = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds["App/ComponentRegistry/ComponentRegistry"]);
        componentRegistry.registerToSlot(_pimcore_studio_ui_bundle_modules_app__WEBPACK_IMPORTED_MODULE_2__.componentConfig.asset.editor.toolbar.slots.left.name, {
            name: 'customToolbarButton',
            component: _components_custom_toolbar_button__WEBPACK_IMPORTED_MODULE_3__["default"],
            priority: 500
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-icons/components/custom-icons.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CustomIcons: () => (CustomIcons)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const CustomIcons = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "Custom Icons"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Card, {
                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Flex, {
                    align: "center",
                    gap: "small",
                    children: [
                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("h1", {
                            children: "Icon Example"
                        }, void 0, false, {
                            fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                            lineNumber: 13,
                            columnNumber: 11
                        }, undefined),
                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Icon, {
                            options: {
                                height: 35,
                                width: 35,
                                style: {
                                    rotate: '90deg'
                                }
                            },
                            value: "rocket-example"
                        }, void 0, false, {
                            fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                            lineNumber: 14,
                            columnNumber: 11
                        }, undefined)
                    ]
                }, void 0, true, {
                    fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                    lineNumber: 9,
                    columnNumber: 9
                }, undefined)
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Space, {
                direction: "vertical",
                size: "small",
                children: [
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.IconButton, {
                        icon: {
                            value: 'rocket-example'
                        },
                        size: "large",
                        type: "default"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.IconTextButton, {
                        icon: {
                            value: 'rocket-example'
                        },
                        children: "Rocket"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.IconTextButton, {
                        icon: {
                            value: 'rocket-example'
                        },
                        type: "primary",
                        children: "Rocket"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, undefined)
                ]
            }, void 0, true, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/components/custom-icons.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, undefined);
};
_c = CustomIcons;
var _c;
$RefreshReg$(_c, "CustomIcons");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-icons/icons/rocket.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Rocket: () => (Rocket)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");


const Rocket = (props)=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("svg", {
        viewBox: "0 0 512 512",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("path", {
            d: "M156.6 384.9L125.7 354c-8.5-8.5-11.5-20.8-7.7-32.2c3-8.9 7-20.5 11.8-33.8L24 288c-8.6 0-16.6-4.6-20.9-12.1s-4.2-16.7 .2-24.1l52.5-88.5c13-21.9 36.5-35.3 61.9-35.3l82.3 0c2.4-4 4.8-7.7 7.2-11.3C289.1-4.1 411.1-8.1 483.9 5.3c11.6 2.1 20.6 11.2 22.8 22.8c13.4 72.9 9.3 194.8-111.4 276.7c-3.5 2.4-7.3 4.8-11.3 7.2l0 82.3c0 25.4-13.4 49-35.3 61.9l-88.5 52.5c-7.4 4.4-16.6 4.5-24.1 .2s-12.1-12.2-12.1-20.9l0-107.2c-14.1 4.9-26.4 8.9-35.7 11.9c-11.2 3.6-23.4 .5-31.8-7.8zM384 168a40 40 0 1 0 0-80 40 40 0 1 0 0 80z",
            fill: "currentColor"
        }, void 0, false, {
            fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/icons/rocket.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, undefined)
    }, void 0, false, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-icons/icons/rocket.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, undefined);
};
_c = Rocket;
var _c;
$RefreshReg$(_c, "Rocket");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-icons/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CustomIconPlugin: () => (CustomIconPlugin)
});
/* ESM import */var _modules_custom_icon_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/custom-icons/modules/custom-icon-extension.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

const CustomIconPlugin = {
    name: 'CustomIconPlugin',
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_custom_icon_extension__WEBPACK_IMPORTED_MODULE_0__.CustomIconExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-icons/modules/custom-icon-extension.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CustomIconExtension: () => (CustomIconExtension)
});
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _components_custom_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./js/src/examples/custom-icons/components/custom-icons.tsx");
/* ESM import */var _icons_rocket__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./js/src/examples/custom-icons/icons/rocket.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");




const CustomIconExtension = {
    onInit () {
        const iconLibrary = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.iconLibrary);
        iconLibrary.register({
            name: 'rocket-example',
            component: _icons_rocket__WEBPACK_IMPORTED_MODULE_3__.Rocket
        });
        const mainNavRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.mainNavRegistry);
        mainNavRegistryService.registerMainNavItem({
            path: 'Example Plugin/Custom Icons',
            widgetConfig: {
                name: 'Custom Icons',
                id: 'custom-icon',
                component: 'custom-icons',
                config: {
                    icon: {
                        type: 'name',
                        value: 'rocket-example'
                    }
                }
            }
        });
        const widgetRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.widgetManager);
        widgetRegistryService.registerWidget({
            name: 'custom-icons',
            component: _components_custom_icons__WEBPACK_IMPORTED_MODULE_2__.CustomIcons
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-widgets/components/another-example-widget.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  AnotherExampleWidget: () => (AnotherExampleWidget)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const AnotherExampleWidget = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "Another example widget"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/another-example-widget.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("div", {
                children: "This is another example widget."
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/another-example-widget.tsx",
                lineNumber: 9,
                columnNumber: 7
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/another-example-widget.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, undefined);
};
_c = AnotherExampleWidget;
var _c;
$RefreshReg$(_c, "AnotherExampleWidget");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-widgets/components/example-widget.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ExampleWidget: () => (ExampleWidget)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_modules_widget_manager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/modules/widget-manager");
/* ESM import */var _pimcore_studio_ui_bundle_modules_widget_manager__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_modules_widget_manager__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

var _s = $RefreshSig$();



const ExampleWidget = ()=>{
    _s();
    const widgetManager = (0,_pimcore_studio_ui_bundle_modules_widget_manager__WEBPACK_IMPORTED_MODULE_2__.useWidgetManager)();
    const [selectedOption, setSelectedOption] = react__WEBPACK_IMPORTED_MODULE_3___default().useState(undefined);
    const [selectedWidget, setSelectedWidget] = react__WEBPACK_IMPORTED_MODULE_3___default().useState(undefined);
    const areButtonsDisabled = selectedWidget === undefined;
    const widgets = [
        {
            name: 'Example widget',
            component: 'example-widget',
            config: {
                icon: {
                    type: 'name',
                    value: 'pimcore'
                }
            }
        },
        {
            name: 'Example widget with fixed id',
            id: 'example-widget-fixed-id',
            component: 'example-widget',
            config: {
                icon: {
                    type: 'name',
                    value: 'pimcore'
                }
            }
        },
        {
            name: 'Another example widget',
            component: 'another-example-widget',
            config: {
                icon: {
                    type: 'name',
                    value: 'pimcore'
                }
            }
        }
    ];
    const onSelectChange = (value)=>{
        setSelectedOption(value);
        const selected = widgets.find((widget)=>widget.name === value);
        setSelectedWidget(selected);
    };
    const selectOptions = widgets.map((widget)=>({
            label: widget.name,
            value: widget.name
        }));
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "Example widget"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("div", {
                children: "Select a widget:"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Select, {
                minWidth: 'normal',
                onChange: onSelectChange,
                options: selectOptions,
                value: selectedOption
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, undefined),
            selectedWidget !== undefined && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Space, {
                direction: "vertical",
                size: "small",
                children: [
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                        disabled: areButtonsDisabled,
                        onClick: ()=>{
                            widgetManager.openMainWidget(selectedWidget);
                        },
                        children: "Open main widget"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                        lineNumber: 78,
                        columnNumber: 11
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                        disabled: areButtonsDisabled,
                        onClick: ()=>{
                            widgetManager.openLeftWidget(selectedWidget);
                        },
                        children: "Open left widget"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                        lineNumber: 85,
                        columnNumber: 11
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                        disabled: areButtonsDisabled,
                        onClick: ()=>{
                            widgetManager.openRightWidget(selectedWidget);
                        },
                        children: "Open right widget"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                        lineNumber: 92,
                        columnNumber: 11
                    }, undefined),
                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Button, {
                        disabled: areButtonsDisabled,
                        onClick: ()=>{
                            widgetManager.openBottomWidget(selectedWidget);
                        },
                        children: "Open bottom widget"
                    }, void 0, false, {
                        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                        lineNumber: 99,
                        columnNumber: 11
                    }, undefined)
                ]
            }, void 0, true, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
                lineNumber: 74,
                columnNumber: 9
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/custom-widgets/components/example-widget.tsx",
        lineNumber: 59,
        columnNumber: 5
    }, undefined);
};
_s(ExampleWidget, "9SVE5efngjMQfV4HN6iSnt75pxk=", false, function() {
    return [
        _pimcore_studio_ui_bundle_modules_widget_manager__WEBPACK_IMPORTED_MODULE_2__.useWidgetManager
    ];
});
_c = ExampleWidget;
var _c;
$RefreshReg$(_c, "ExampleWidget");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-widgets/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CustomWidgetsPlugin: () => (CustomWidgetsPlugin)
});
/* ESM import */var _modules_custom_widgets_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/custom-widgets/modules/custom-widgets-extension.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

const CustomWidgetsPlugin = {
    name: 'CustomWidgetsPlugin',
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_custom_widgets_extension__WEBPACK_IMPORTED_MODULE_0__.CustomWidgetsExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/custom-widgets/modules/custom-widgets-extension.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CustomWidgetsExtension: () => (CustomWidgetsExtension)
});
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _components_example_widget__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./js/src/examples/custom-widgets/components/example-widget.tsx");
/* ESM import */var _components_another_example_widget__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./js/src/examples/custom-widgets/components/another-example-widget.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");




const CustomWidgetsExtension = {
    onInit: ()=>{
        const mainNavRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.mainNavRegistry);
        mainNavRegistryService.registerMainNavItem({
            path: 'Example Plugin/Custom Widgets',
            widgetConfig: {
                name: 'Custom Widgets',
                id: 'custom-widgets',
                component: 'example-widget',
                config: {
                    icon: {
                        type: 'name',
                        value: 'pimcore'
                    }
                }
            }
        });
        const widgetRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.widgetManager);
        widgetRegistryService.registerWidget({
            name: 'example-widget',
            component: _components_example_widget__WEBPACK_IMPORTED_MODULE_2__.ExampleWidget
        });
        widgetRegistryService.registerWidget({
            name: 'another-example-widget',
            component: _components_another_example_widget__WEBPACK_IMPORTED_MODULE_3__.AnotherExampleWidget
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/dynamic-types/components/data-grid.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DataGrid: () => (DataGrid)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const columns = [
    {
        id: 'number-cell',
        accessorFn: (row)=>row['number-cell'],
        accessorKey: 'number-cell',
        header: 'Number',
        meta: {
            type: 'number'
        }
    },
    {
        id: 'text-cell',
        accessorFn: (row)=>row['text-cell'],
        accessorKey: 'text-cell',
        header: 'Text',
        meta: {
            type: 'text'
        }
    },
    {
        id: 'boolean-cell',
        accessorFn: (row)=>row['boolean-cell'],
        accessorKey: 'boolean-cell',
        header: 'Boolean',
        meta: {
            type: 'boolean',
            editable: false
        }
    },
    {
        id: 'live-updating',
        accessorFn: (row)=>row['live-updating'],
        accessorKey: 'live-updating',
        header: 'Live Updating',
        meta: {
            type: 'live-updating'
        }
    }
];
const data = [
    {
        'number-cell': 1,
        'text-cell': 'Hello',
        'live-updating': '2234',
        'boolean-cell': true
    },
    {
        'number-cell': 2,
        'text-cell': 'World',
        'live-updating': '543',
        'boolean-cell': false
    },
    {
        'number-cell': 3,
        'text-cell': '!',
        'live-updating': '234',
        'boolean-cell': true
    }
];
const DataGrid = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Grid, {
        columns: columns,
        data: data
    }, void 0, false, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/dynamic-types/components/data-grid.tsx",
        lineNumber: 71,
        columnNumber: 5
    }, undefined);
};
_c = DataGrid;
var _c;
$RefreshReg$(_c, "DataGrid");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/dynamic-types/components/dynamic-types-widget.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DynamicTypesWidget: () => (DynamicTypesWidget)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var _data_grid__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./js/src/examples/dynamic-types/components/data-grid.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");




const DynamicTypesWidget = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "Dynamic types"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/dynamic-types/components/dynamic-types-widget.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_data_grid__WEBPACK_IMPORTED_MODULE_3__.DataGrid, {}, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/dynamic-types/components/dynamic-types-widget.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/dynamic-types/components/dynamic-types-widget.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, undefined);
};
_c = DynamicTypesWidget;
var _c;
$RefreshReg$(_c, "DynamicTypesWidget");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/dynamic-types/dynamic-types/components/live-updating-cell-component.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  LiveUpdatingCellComponent: () => (LiveUpdatingCellComponent)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

var _s = $RefreshSig$();

const LiveUpdatingCellComponent = (param)=>{
    let { getValue } = param;
    _s();
    const [currentValue, setCurrentValue] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(0);
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        // Simulate a live updating value
        // In a real-world scenario, this could be a Server Side Event or an API call
        // The cell value could be used as a configuration for the API call
        // or the SSE connection
        const timer = setInterval(()=>{
            const newValue = Math.floor(Math.random() * 1000);
            setCurrentValue(newValue);
        }, 2000);
        return ()=>{
            clearInterval(timer);
        };
    }, []);
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("div", {
        className: "default-cell__content",
        children: currentValue
    }, void 0, false, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/dynamic-types/dynamic-types/components/live-updating-cell-component.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, undefined);
};
_s(LiveUpdatingCellComponent, "vyGE0LIa13AZKcp1f7NPhW6GgIU=");
_c = LiveUpdatingCellComponent;
var _c;
$RefreshReg$(_c, "LiveUpdatingCellComponent");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/dynamic-types/dynamic-types/definitions/live-updating-cell.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  LiveUpdatingCell: () => (LiveUpdatingCell)
});
/* ESM import */var _swc_helpers_ts_decorate__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__("./node_modules/tslib/tslib.es6.mjs");
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_modules_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/modules/element");
/* ESM import */var _pimcore_studio_ui_bundle_modules_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_modules_element__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var _components_live_updating_cell_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./js/src/examples/dynamic-types/dynamic-types/components/live-updating-cell-component.tsx");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_4__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");






class LiveUpdatingCell extends _pimcore_studio_ui_bundle_modules_element__WEBPACK_IMPORTED_MODULE_1__.DynamicTypeGridCellAbstract {
    getGridCellComponent(props) {
        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_live_updating_cell_component__WEBPACK_IMPORTED_MODULE_3__.LiveUpdatingCellComponent, {
            ...props
        }, void 0, false, {
            fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/dynamic-types/dynamic-types/definitions/live-updating-cell.tsx",
            lineNumber: 11,
            columnNumber: 12
        }, this);
    }
    constructor(...args){
        super(...args), this.id = 'live-updating';
    }
}
LiveUpdatingCell = (0,_swc_helpers_ts_decorate__WEBPACK_IMPORTED_MODULE_5__.__decorate)([
    (0,_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_4__.injectable)()
], LiveUpdatingCell);

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/dynamic-types/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DynamicTypePlugin: () => (DynamicTypePlugin)
});
/* ESM import */var _modules_dynamic_types_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/dynamic-types/modules/dynamic-types-extension.tsx");
/* ESM import */var _dynamic_types_definitions_live_updating_cell__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./js/src/examples/dynamic-types/dynamic-types/definitions/live-updating-cell.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");


const DynamicTypePlugin = {
    name: 'DynamicTypePlugin',
    onInit (param) {
        let { container } = param;
        container.bind('DynamicTypes/GridCell/LiveUpdatingCell').to(_dynamic_types_definitions_live_updating_cell__WEBPACK_IMPORTED_MODULE_1__.LiveUpdatingCell);
    },
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_dynamic_types_extension__WEBPACK_IMPORTED_MODULE_0__.DynamicTypeExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/dynamic-types/modules/dynamic-types-extension.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DynamicTypeExtension: () => (DynamicTypeExtension)
});
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _components_dynamic_types_widget__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./js/src/examples/dynamic-types/components/dynamic-types-widget.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const DynamicTypeExtension = {
    onInit: ()=>{
        const mainNavRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.mainNavRegistry);
        mainNavRegistryService.registerMainNavItem({
            path: 'Example Plugin/Dynamic Types',
            widgetConfig: {
                name: 'Dynamic Types',
                id: 'dynamic-types',
                component: 'dynamic-types',
                config: {
                    icon: {
                        type: 'name',
                        value: 'pimcore'
                    }
                }
            }
        });
        const widgetRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.widgetManager);
        widgetRegistryService.registerWidget({
            name: 'dynamic-types',
            component: _components_dynamic_types_widget__WEBPACK_IMPORTED_MODULE_2__.DynamicTypesWidget
        });
        const gridCellRegistry = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds["DynamicTypes/GridCellRegistry"]);
        gridCellRegistry.registerDynamicType(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get('DynamicTypes/GridCell/LiveUpdatingCell'));
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/main-nav-entry/components/example-tool.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  "default": () => (__WEBPACK_DEFAULT_EXPORT__)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const ExampleTool = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__.Header, {
                title: "Example Tool"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/main-nav-entry/components/example-tool.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_2__.Alert, {
                message: "Just a quick demo how to open main widgets from the main navigation menu."
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/main-nav-entry/components/example-tool.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/main-nav-entry/components/example-tool.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, undefined);
};
_c = ExampleTool;
/* ESM default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ExampleTool);
var _c;
$RefreshReg$(_c, "ExampleTool");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/main-nav-entry/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  MainNavEntryPlugin: () => (MainNavEntryPlugin)
});
/* ESM import */var _modules_main_nav_entry_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/main-nav-entry/modules/main-nav-entry-extension.ts");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

const MainNavEntryPlugin = {
    name: 'MainNavEntryPlugin',
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_main_nav_entry_extension__WEBPACK_IMPORTED_MODULE_0__.MainNavEntryExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/main-nav-entry/modules/main-nav-entry-extension.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  MainNavEntryExtension: () => (MainNavEntryExtension)
});
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _components_example_tool__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./js/src/examples/main-nav-entry/components/example-tool.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const MainNavEntryExtension = {
    onInit: ()=>{
        const mainNavRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.mainNavRegistry);
        mainNavRegistryService.registerMainNavItem({
            path: 'Example Plugin',
            icon: 'pimcore'
        });
        mainNavRegistryService.registerMainNavItem({
            path: 'Example Plugin/Example Tool',
            widgetConfig: {
                name: 'Example Tool',
                id: 'example-tool',
                component: 'example-tool',
                config: {
                    icon: {
                        type: 'name',
                        value: 'pimcore'
                    }
                }
            }
        });
        const widgetRegistryService = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_0__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_1__.serviceIds.widgetManager);
        widgetRegistryService.registerWidget({
            name: 'example-tool',
            component: _components_example_tool__WEBPACK_IMPORTED_MODULE_2__["default"]
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/tab-manager/components/example-tab.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ExampleTab: () => (ExampleTab)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const ExampleTab = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "Example Tab"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/example-tab.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, undefined),
            "This is an example tab."
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/example-tab.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, undefined);
};
_c = ExampleTab;
var _c;
$RefreshReg$(_c, "ExampleTab");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/tab-manager/components/preview-tab.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  PreviewTab: () => (PreviewTab)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");



const PreviewTab = ()=>{
    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Content, {
        padded: true,
        children: [
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Header, {
                title: "New preview tab"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/preview-tab.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, undefined),
            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_1__.Alert, {
                message: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("div", {
                    children: [
                        "This is a new preview tab.",
                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)("br", {}, void 0, false, {
                            fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/preview-tab.tsx",
                            lineNumber: 11,
                            columnNumber: 39
                        }, void 0),
                        "It replaces the default preview tab."
                    ]
                }, void 0, true, {
                    fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/preview-tab.tsx",
                    lineNumber: 10,
                    columnNumber: 11
                }, void 0),
                type: "info"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/preview-tab.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, undefined)
        ]
    }, void 0, true, {
        fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/components/preview-tab.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, undefined);
};
_c = PreviewTab;
var _c;
$RefreshReg$(_c, "PreviewTab");

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/tab-manager/index.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  TabManagerPlugin: () => (TabManagerPlugin)
});
/* ESM import */var _modules_asset_folder_tab_exentsion__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/tab-manager/modules/asset-folder-tab-exentsion.tsx");
/* ESM import */var _modules_object_preview_tab_extension__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./js/src/examples/tab-manager/modules/object-preview-tab-extension.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");


const TabManagerPlugin = {
    name: 'TabManagerPlugin',
    onStartup (param) {
        let { moduleSystem } = param;
        moduleSystem.registerModule(_modules_asset_folder_tab_exentsion__WEBPACK_IMPORTED_MODULE_0__.AssetFolderTabExtension);
        moduleSystem.registerModule(_modules_object_preview_tab_extension__WEBPACK_IMPORTED_MODULE_1__.ObjectPreviewExtension);
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/tab-manager/modules/asset-folder-tab-exentsion.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  AssetFolderTabExtension: () => (AssetFolderTabExtension)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/components");
/* ESM import */var _pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_3__);
/* ESM import */var _components_example_tab__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("./js/src/examples/tab-manager/components/example-tab.tsx");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_5__);
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");






const AssetFolderTabExtension = {
    onInit () {
        const folderTabManager = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2__.serviceIds["Asset/Editor/FolderTabManager"]);
        folderTabManager.register({
            key: 'example-folder-tab',
            label: 'Example Folder Tab',
            icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_pimcore_studio_ui_bundle_components__WEBPACK_IMPORTED_MODULE_3__.Icon, {
                value: "pimcore"
            }, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/modules/asset-folder-tab-exentsion.tsx",
                lineNumber: 15,
                columnNumber: 13
            }, this),
            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_example_tab__WEBPACK_IMPORTED_MODULE_4__.ExampleTab, {}, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/modules/asset-folder-tab-exentsion.tsx",
                lineNumber: 16,
                columnNumber: 17
            }, this)
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/examples/tab-manager/modules/object-preview-tab-extension.tsx": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ObjectPreviewExtension: () => (ObjectPreviewExtension)
});
/* ESM import */var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/react/jsx-dev-runtime.js");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle");
/* ESM import */var _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("webpack/container/remote/@pimcore/studio-ui-bundle/app");
/* ESM import */var _pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("webpack/sharing/consume/default/react/react");
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);
/* ESM import */var _components_preview_tab__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("./js/src/examples/tab-manager/components/preview-tab.tsx");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");





const ObjectPreviewExtension = {
    onInit () {
        const objectTabManager = _pimcore_studio_ui_bundle__WEBPACK_IMPORTED_MODULE_1__.container.get(_pimcore_studio_ui_bundle_app__WEBPACK_IMPORTED_MODULE_2__.serviceIds["DataObject/Editor/ObjectTabManager"]);
        const previewTab = objectTabManager.getTab('preview');
        if (previewTab === undefined) {
            throw new Error('Preview tab not found');
        }
        objectTabManager.register({
            ...previewTab,
            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_preview_tab__WEBPACK_IMPORTED_MODULE_4__.PreviewTab, {}, void 0, false, {
                fileName: "/var/www/html/dev/pimcore/studio-example-bundle/assets/js/src/examples/tab-manager/modules/object-preview-tab-extension.tsx",
                lineNumber: 18,
                columnNumber: 17
            }, this)
        });
    }
};

function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),
"./js/src/plugins.ts": (function (module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ApiDataPlugin: () => (/* reexport safe */ _examples_api_data__WEBPACK_IMPORTED_MODULE_6__.ApiDataPlugin),
  AssetEditorToolbarButtonPlugin: () => (/* reexport safe */ _examples_asset_editor_toolbar_button__WEBPACK_IMPORTED_MODULE_1__.AssetEditorToolbarButtonPlugin),
  CustomIconPlugin: () => (/* reexport safe */ _examples_custom_icons__WEBPACK_IMPORTED_MODULE_3__.CustomIconPlugin),
  CustomWidgetsPlugin: () => (/* reexport safe */ _examples_custom_widgets__WEBPACK_IMPORTED_MODULE_4__.CustomWidgetsPlugin),
  DynamicTypePlugin: () => (/* reexport safe */ _examples_dynamic_types__WEBPACK_IMPORTED_MODULE_5__.DynamicTypePlugin),
  MainNavEntryPlugin: () => (/* reexport safe */ _examples_main_nav_entry__WEBPACK_IMPORTED_MODULE_0__.MainNavEntryPlugin),
  TabManagerPlugin: () => (/* reexport safe */ _examples_tab_manager__WEBPACK_IMPORTED_MODULE_2__.TabManagerPlugin)
});
/* ESM import */var _examples_main_nav_entry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./js/src/examples/main-nav-entry/index.ts");
/* ESM import */var _examples_asset_editor_toolbar_button__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./js/src/examples/asset-editor-toolbar-button/index.ts");
/* ESM import */var _examples_tab_manager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./js/src/examples/tab-manager/index.ts");
/* ESM import */var _examples_custom_icons__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("./js/src/examples/custom-icons/index.ts");
/* ESM import */var _examples_custom_widgets__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__("./js/src/examples/custom-widgets/index.ts");
/* ESM import */var _examples_dynamic_types__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__("./js/src/examples/dynamic-types/index.ts");
/* ESM import */var _examples_api_data__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__("./js/src/examples/api-data/index.ts");
/* provided dependency */ var $ReactRefreshRuntime$ = __webpack_require__("./node_modules/@rspack/plugin-react-refresh/client/reactRefresh.js");

// import { LeftSidebarPlugin } from './examples/left-sidebar'






// Examples are splitted into separate plugins to create a clear separation for better understanding.
// You can also combine them into one plugin if you want to.


function $RefreshSig$() {
  return $ReactRefreshRuntime$.createSignatureFunctionForTransform();
}
function $RefreshReg$(type, id) {
  $ReactRefreshRuntime$.register(type, module.id + "_" + id);
}
Promise.resolve().then(function() {
  $ReactRefreshRuntime$.refresh(module.id, module.hot);
});


}),

}]);
//# sourceMappingURL=__federation_expose_default_export.js.map
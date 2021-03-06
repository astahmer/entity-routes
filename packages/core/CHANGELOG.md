# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.2](https://github.com/astahmer/entity-routes/compare/v0.2.1...v0.2.2) (2020-12-12)


### Documentation

* update install instructions ([a5ea2cf](https://github.com/astahmer/entity-routes/commit/a5ea2cf199613f45e40a2a66970d6ee1c75a313a))

### [0.2.1](https://github.com/astahmer/entity-routes/compare/v0.2.0...v0.2.1) (2020-12-11)

### [0.1.8](https://github.com/astahmer/entity-routes/compare/v0.1.7...v0.1.8) (2020-11-21)

### [0.1.7](https://github.com/astahmer/entity-routes/compare/v0.1.6...v0.1.7) (2020-10-20)

### Features

-   **EntityRouteOptions:** scoped by operation ([1680858](https://github.com/astahmer/entity-routes/commit/1680858aac2832f6013af3b76796b5ed5b1dcd8f))
-   **Formater:** allow opting-out of sort / pass custom comparator function ([80dafac](https://github.com/astahmer/entity-routes/commit/80dafacd830ae1c9ec49f93a4d9bde8c393f699b))
-   **Groups:** allow exposing accessor (getter/setter) ([913eb71](https://github.com/astahmer/entity-routes/commit/913eb7124ebedaac1d7aeb0270c9a6f667ca5908))
-   **OpenAPI:** make basic specs from entity-routes ([802bbce](https://github.com/astahmer/entity-routes/commit/802bbce77e8f7d45c764021ce5bd847fbcc83ef7))
-   **Subresources:** shouldAllowCircular ([cc73813](https://github.com/astahmer/entity-routes/commit/cc738130fc86582cf33014d788974f6f92c83b43))
-   **Writer:** add custom decorators & basic test ([94cc301](https://github.com/astahmer/entity-routes/commit/94cc301180cbe36f5c972bdf90d0fb133725017d))

### Bug Fixes

-   **Decorator:** rm unneeded calls/clone prop ([18bbd51](https://github.com/astahmer/entity-routes/commit/18bbd51b6af5b77396cc4383e2b8396a4e1e5a58))
-   import casing ([6146870](https://github.com/astahmer/entity-routes/commit/614687033f9c7b428c25b98ef17c66761df6a75e))
-   **EntityRouteScopedOptions:** pass hooks & add test ([f8b1f59](https://github.com/astahmer/entity-routes/commit/f8b1f5995b0bf2fa5e82dc2234d106df4c9a3bc0))
-   **EntityRouteScopedOptions:** restrict options overridable ([a7e8807](https://github.com/astahmer/entity-routes/commit/a7e880754baa07c3cb96f0d9f26e6407e0ca8a5c))
-   **MiddlewareMaker:** handle controller error ([0b4b272](https://github.com/astahmer/entity-routes/commit/0b4b2724fb6543d860496704bf20f3c597535db6))
-   **RouteController:** pass requestId on auto-reload ([c8e7829](https://github.com/astahmer/entity-routes/commit/c8e7829d0317c6bfb731ba4dcbf2179c9129153b))
-   **SubresourceMaker:** rename file & fix test ([8e280e3](https://github.com/astahmer/entity-routes/commit/8e280e3f4989249351144fa69174dbc0754b6215))
-   **Writer:** fromItem decorators typings ([ac832fe](https://github.com/astahmer/entity-routes/commit/ac832fe1a0c257850501ec874f1bc6e6c14c09ce))
-   merge scopedOptions once in response mw ([758ae5d](https://github.com/astahmer/entity-routes/commit/758ae5d2709c51b8a25da99537d62cad2bd34adf))

### [0.1.6](https://github.com/astahmer/entity-routes/compare/v0.1.4...v0.1.6) (2020-09-20)

### Features

-   **Formater:** allow opting-out of IRI's ([14ce94e](https://github.com/astahmer/entity-routes/commit/14ce94ed7f58763a9b81708619c69b334e182eeb))

### Bug Fixes

-   **RelationManager:** isJoinAlreadyMade ([ada8986](https://github.com/astahmer/entity-routes/commit/ada8986cee20bb04d26ed0f46568087c2542f00e))
-   **tests:** filter related after paramName changes ([c449af7](https://github.com/astahmer/entity-routes/commit/c449af7762278a3321560af2ad78648d216b5d86))
-   **WhereManager:** add NOT to paramName ([ca0f776](https://github.com/astahmer/entity-routes/commit/ca0f7769165a8794f487d0a1176d8fa9a534aa6e))
-   **WhereManager:** paramName use strategy ([cae86b9](https://github.com/astahmer/entity-routes/commit/cae86b9a8e39e54594ce94b94e6914597ada2083))

### [0.1.5](https://github.com/astahmer/entity-routes/compare/v0.1.4...v0.1.5) (2020-08-30)

### Features

-   **docs:** init with dokz ([59f7a22](https://github.com/astahmer/entity-routes/commit/59f7a220e825691fd6c5184df867983b626ef257))
-   **EntityRouter:** allow having global before/after middlewares ([239a754](https://github.com/astahmer/entity-routes/commit/239a7540dc9bbdf1951fed066711bc5a91488c38))

### Bug Fixes

-   typings ([545b7ff](https://github.com/astahmer/entity-routes/commit/545b7ff58c0a0414641fab5d0beae1a12be3fcfc))
-   wording ([7b6b61d](https://github.com/astahmer/entity-routes/commit/7b6b61d522815a3c99449db638e117b993a326ce))

### [0.1.4](https://github.com/astahmer/entity-routes/compare/v0.1.3...v0.1.4) (2020-08-02)

### Bug Fixes

-   **package:** deps & add release-publish script ([c1d04ea](https://github.com/astahmer/entity-routes/commit/c1d04eaa9d44e5e266ce653e8d6156b154f2b012))

### [0.1.3](https://github.com/astahmer/entity-routes/compare/v0.1.2...v0.1.3) (2020-08-02)

### Bug Fixes

-   **package:** deps & scripts ([1ea499f](https://github.com/astahmer/entity-routes/commit/1ea499f7ed7ac8bfda3e53b5f4cb7d38d9b7ba66))

### [0.1.2](https://github.com/astahmer/entity-routes/compare/v0.1.1...v0.1.2) (2020-08-02)

### 0.1.1 (2020-08-02)

### Features

-   **abstract filter:** add "allShallow" option ([e2be836](https://github.com/astahmer/entity-routes/commit/e2be8369a32ebae8a963a111eef60bdc6b72fbd7))
-   **abstractfilter:** getPropMetaAtPath add shouldReturnRelatoinInsteadOfId option ([804baa4](https://github.com/astahmer/entity-routes/commit/804baa43267d7ad2770ab2c43dc0eb86a0d639e8))
-   **asserts:** add isDate & isObjectLiteral ([25f500d](https://github.com/astahmer/entity-routes/commit/25f500d0e713f2f7ac42de761938418585e007cb))
-   **context-adapter:** make middlewares framework-agnostic ([3e50dcc](https://github.com/astahmer/entity-routes/commit/3e50dcc6eced674ae02378b4f464790f75e4896f))
-   **EntityRouter:** add before/afterRequestContext & tests ([414cf3c](https://github.com/astahmer/entity-routes/commit/414cf3cf93b413ea13af2a712f7c1c7668c5d8e8))
-   **EntityRouter:** add more options & enhance typings ([e3ffff4](https://github.com/astahmer/entity-routes/commit/e3ffff44231385ade6f13287c9bc1423d8849080))
-   **EntityRouter:** attach BridgeRouter in case it needs to be retrieved ([f925314](https://github.com/astahmer/entity-routes/commit/f9253140dc536cb94f9d1d259289fba2d890c2e7))
-   **express:** store body in locals ([47f4826](https://github.com/astahmer/entity-routes/commit/47f482651c78eee2029e2c04d553f6237946e7da))
-   **functions/array:** add isEqualArrays, getUniqueValues, combineUniqueValues ([1848b15](https://github.com/astahmer/entity-routes/commit/1848b154320044e8ed10e479a8300f99fe1339b8))
-   **functions/array:** flatMap getProp defaults to self ([da912c0](https://github.com/astahmer/entity-routes/commit/da912c0c5f254b209e335f757dfa5ac78c4c5825))
-   **functions/object:** add pickBy & pickDefined ([f52d12d](https://github.com/astahmer/entity-routes/commit/f52d12d3bb4bab01e8ed966048f370a2ffe32bf4))
-   **functions/object:** allow passing options to deepMerge & add withUniqueArrayValues ([2db53c7](https://github.com/astahmer/entity-routes/commit/2db53c74d0d0bd4a1997f739e4d910ed9d7394c0))
-   **functions/object:** deepSort fn ([5d1d754](https://github.com/astahmer/entity-routes/commit/5d1d754e8e564728a307da22c486b415963c9cd6))
-   **functions/route:** add formatRoutePath ([2427cae](https://github.com/astahmer/entity-routes/commit/2427caeaadf972f1cb4c46f612c1a9a9fd95ced3))
-   **groups-metadata:** enhance & fix advanced use cases ([e19e411](https://github.com/astahmer/entity-routes/commit/e19e411074b6feb22c2c991175d0636e59536dba))
-   **hooks:** add all basics hooks & tests ([1a9638a](https://github.com/astahmer/entity-routes/commit/1a9638aafca7a911879ea0f903b218036c3769b1))
-   **Persistor:** throw on empty item after clean/validation ([81300dc](https://github.com/astahmer/entity-routes/commit/81300dc254fcd227b0b1579e08ba60ca4513e784))
-   **RelationManager:** subresource should throw on missing inverse relation ([7f5c598](https://github.com/astahmer/entity-routes/commit/7f5c59897fbd6367fa2aed56ec66849fff88aa31))
-   **request:** add hooks & store ([5795eb4](https://github.com/astahmer/entity-routes/commit/5795eb4a2c9e88bbd130414eef8f231984fbd6c2))
-   **route-controller:** allow overriding action options with 2nd arg ([2d88270](https://github.com/astahmer/entity-routes/commit/2d88270a12a31e15e3bbeab998a519d349a9a023))
-   **routers:** move router-related files to a dedicated dir & use BridgeRouter ([ccba90b](https://github.com/astahmer/entity-routes/commit/ccba90b1b3b3c22ed9cfad51c6c82db3bd10a496))
-   **searchfilter:** use object instead of array for nested conditions & fix nested complex whereType ([2628145](https://github.com/astahmer/entity-routes/commit/2628145a0c4ff474bc611882122f8ad0ab0c716e))
-   **subresources:** add proper nesting & options ([95e2085](https://github.com/astahmer/entity-routes/commit/95e2085781d871c0059926a9e11b63f97d22b126))
-   **test:** add makeTestCtx & MockContext & change default log depth ([4787b67](https://github.com/astahmer/entity-routes/commit/4787b6765bc6008fb0afeab67ead8509613f859c))
-   **test:** allow passing options to test server setup ([ea2d7f4](https://github.com/astahmer/entity-routes/commit/ea2d7f497e106c6d6dccdac1d126ad92c1fbb56b))
-   **test:** extend expect with toEqualMessy ([9663efd](https://github.com/astahmer/entity-routes/commit/9663efddcdb5396993689c1f7f6ca9548122f84d))
-   **types:** add RequestContextMinimal ([e3e6aa3](https://github.com/astahmer/entity-routes/commit/e3e6aa3f3bf682ee73e9d89e85c92e3c6e1f4c75))
-   **utils:** add log fn as shortcut to display nested obj ([042af93](https://github.com/astahmer/entity-routes/commit/042af93687eaaa5a3101f379a012bef0a0c1cb21))
-   **utils:** add options arg to override default log options ([9aae205](https://github.com/astahmer/entity-routes/commit/9aae205714e57fcb1a702c1683e5594e5cc0646b))
-   **webpack:** use babel-loader ([df5e544](https://github.com/astahmer/entity-routes/commit/df5e5445f8283712685be79292f7f68f6bb366f7))
-   allow setNestedKey to use a dot-delimited string path ([3038f81](https://github.com/astahmer/entity-routes/commit/3038f817cbe210aa93de6d47840163f7a295f162))
-   handle soft-delete & add restore route ([de44e31](https://github.com/astahmer/entity-routes/commit/de44e311dbb0083b1aa93303b33196178fbd12b9))
-   **validator:** add option to opt-out of recursive validation ([a62c800](https://github.com/astahmer/entity-routes/commit/a62c8003ce3a661e347513c31d59eae28e7c13e4))
-   add BridgeRouter & koa adapter ([8510c79](https://github.com/astahmer/entity-routes/commit/8510c793896f3fc7df56c79c8b746f1e23c88bf6))
-   **validator:** add an option to opt-out of auto groups provided to validators ([e9cf654](https://github.com/astahmer/entity-routes/commit/e9cf654e755dce3d80a7bc768d77ccf66226039d))

### Bug Fixes

-   **BridgeRouter:** rm routerFactoryClass ([d44105d](https://github.com/astahmer/entity-routes/commit/d44105d482a1ef14ea0c2449a1318169f3734ecc))
-   only log in dev env ([47d4b21](https://github.com/astahmer/entity-routes/commit/47d4b2144adc5214d90461bd1682ab280a50fef7))
-   **abstractfilter:** recursive condition & allow dot-delimited string propPath ([6858e9b](https://github.com/astahmer/entity-routes/commit/6858e9b01d918926ce4f7f01a3151725aca2860b))
-   **AbstractFilter:** rm unused code ([4595ae9](https://github.com/astahmer/entity-routes/commit/4595ae98f44db1f720f11f3564b9351d54f672a2))
-   **alias-handler:** rm outdated docs ([e7ff6d3](https://github.com/astahmer/entity-routes/commit/e7ff6d3833ef5a8934a7dc81a41408649a66d8d2))
-   **asserts:** isEntity returns is GenericEntity ([a534f2a](https://github.com/astahmer/entity-routes/commit/a534f2a63c1452dd690f43e1c24f34900ef105ce))
-   **BridgeRouter:** extract areSameRoutes ([98c5453](https://github.com/astahmer/entity-routes/commit/98c5453fd004363cf769f29357a43439d50cdc68))
-   **cleaner:** formatIriToId as int ([1e1bb6e](https://github.com/astahmer/entity-routes/commit/1e1bb6e297d84a8a67769d78ff7dea8eb476ce08))
-   **context-adapter:** rm setState ([0b07762](https://github.com/astahmer/entity-routes/commit/0b07762f8113a9e3d801709c2ccad13b8116ee36))
-   **decorator:** entity-route path fallback to target name & provide default empty operations array ([b84a314](https://github.com/astahmer/entity-routes/commit/b84a31418d69dee68f9e9a261be741a61e13a9e4))
-   **decorators:** MaxDepth without args for prop/class ([6695663](https://github.com/astahmer/entity-routes/commit/669566372f452f38f57b289ad5329ef1b4ea5638))
-   **denormalizer:** defaultValidatorOptions on update ([f6dc503](https://github.com/astahmer/entity-routes/commit/f6dc5033ae4c90da636403145dd599467895c0a6))
-   **entity:** rm getIri ([cc8314d](https://github.com/astahmer/entity-routes/commit/cc8314d5342aaf2ea1d744acf98cf8bb622bbb89))
-   **entityrouter:** pass routeMetadata instead of retrieving it twice ([2a67c35](https://github.com/astahmer/entity-routes/commit/2a67c3528ab63bd3b90791449141f90ad9664a4d))
-   **filter apply:** remove whereExp from AbstractFilterApplyArgs ([e0fa863](https://github.com/astahmer/entity-routes/commit/e0fa86384f67e65e5da29c22acf4452f40c9b0e8))
-   **fn/entity:** formatIriToId should handle number just in case ([262a37d](https://github.com/astahmer/entity-routes/commit/262a37dedce01b73b2007c4ab6bbd5600c230794))
-   **Formater:** parallelize setComputedProps ([4fba8f7](https://github.com/astahmer/entity-routes/commit/4fba8f76989e0bf70c8652df24efa40c6d49c22d))
-   **groups:** rename to GROUPS_OPERATIONS ([f411d6b](https://github.com/astahmer/entity-routes/commit/f411d6b6ccbf3ce69b2444fb86627124ca650e5c))
-   **GroupsMetadata:** always/localAlways groups on parent entities when using custom operations ([9ca5cfe](https://github.com/astahmer/entity-routes/commit/9ca5cfe6f51856ea14d5f7264500a9424dbe86c3))
-   **hooks:** add before/AfterRead on getList & pass hooks to Persistor ([a1e944f](https://github.com/astahmer/entity-routes/commit/a1e944f671106643b227c30be576e93f0762ad3a))
-   **jest-config:** setupFilesAfterEnv duplicated ([7a334c3](https://github.com/astahmer/entity-routes/commit/7a334c38b32b28cf1460b87a82f5c6135a451a83))
-   **maker:** only getMetadataStorage once ([3863322](https://github.com/astahmer/entity-routes/commit/3863322ba05a9e26b699e840211acecc5476f29c))
-   **maker:** reset connectionManager before pushing ([19d2dab](https://github.com/astahmer/entity-routes/commit/19d2dab091247b48e09d429043d0efb7c339cde0))
-   **mapping-manager:** pass correct entity target ([1cea7e5](https://github.com/astahmer/entity-routes/commit/1cea7e5fc9335bd682f081618fe888cd677979bc))
-   **MiddlewareMaker:** add context data even on errors ([e2bf608](https://github.com/astahmer/entity-routes/commit/e2bf6081508d3e87c82db5b3feb12e3f9cf7707f))
-   **MiddlewareMaker:** express ordering of middlewares ([e990716](https://github.com/astahmer/entity-routes/commit/e990716c9adc64b3dea59c6b668ab4fa94cddff1))
-   **Normalizer:** use NormalizerOptions ([354d011](https://github.com/astahmer/entity-routes/commit/354d011bd0b6a1e9841ddaca61b09d0624ec16ba))
-   **parsers:** handle Date as special case of objects ([adef49d](https://github.com/astahmer/entity-routes/commit/adef49daacdcb35660d0a095c2b7656c02c6ee62))
-   **relation-manager:** maxDepth.fields prop name ([d88ef32](https://github.com/astahmer/entity-routes/commit/d88ef3294088ef1f074f3115fa00595afa66eed3))
-   **route-manager:** rename params to requestContext & default options = {} ([0eb92f1](https://github.com/astahmer/entity-routes/commit/0eb92f100a1ff3e25a7dc645b2274e814444dc40))
-   **RouteController:** allow creating entity without body if on a subresource ([f997bdd](https://github.com/astahmer/entity-routes/commit/f997bdda6744c6bf42f4c56709a85e387e0a4233))
-   **RouteController:** default responseOperation groups ([4ed479b](https://github.com/astahmer/entity-routes/commit/4ed479b443c06db81fa772e5be2a36752681baea))
-   **RouteController:** getList with nested subresources ([85814e9](https://github.com/astahmer/entity-routes/commit/85814e9753acc5b8cdce66c5e2211666dd4d1751))
-   **RouteController:** prevent create/update result to be flattened to IRI ([996ebaf](https://github.com/astahmer/entity-routes/commit/996ebaf4ee90520f47262bb5164c349f251a0084))
-   **search filter:** avoid recreating nestedConditionRegex ([d067870](https://github.com/astahmer/entity-routes/commit/d06787029f192692a21be81cfc7bbddd14bcb67b))
-   **searchfilter:** applyFilterParam return when column not found ([81726e0](https://github.com/astahmer/entity-routes/commit/81726e0b1f17118d96c2779f45be63f9c12d6522))
-   **searchfilter:** formatedValue is always an array ([d51e868](https://github.com/astahmer/entity-routes/commit/d51e8688ed11589e0d07c33136e2b8e08e581c6e))
-   **searchfilter:** isIriValidForProperty handle id column from a relation ([0f4df1f](https://github.com/astahmer/entity-routes/commit/0f4df1f1ae0f88a2d81dd5f70c22241febfb5fe4))
-   **SubresourceManager:** compare each subresource maxDepth ([4c13872](https://github.com/astahmer/entity-routes/commit/4c1387251222beb304a7e43fbe661ce7b55e9caf))
-   **subresources:** chained XToOne relations & add more tests ([f07b617](https://github.com/astahmer/entity-routes/commit/f07b617f46959286350100c39cbaf86c8d90b663))
-   **subresources:** improved routes making, fix auto-joins & add tests & utils-types ([8a842fb](https://github.com/astahmer/entity-routes/commit/8a842fb4103acabbe392f64d47c5b371ebe78f44))
-   **subresources:** move subresource parent auto-join after cleaner ([a9718dc](https://github.com/astahmer/entity-routes/commit/a9718dc86b2d898e1e7e85fbff63a1a700fb0e51))
-   **test:** entityRoute decorator path registered ([b1f808a](https://github.com/astahmer/entity-routes/commit/b1f808af71465beea3588e9577575d6a55029d7e))
-   **test:** Formater after getId removal ([a9148f3](https://github.com/astahmer/entity-routes/commit/a9148f3062a29db3aafe47d9cf43598763cf8b76))
-   **test:** Formater test ([246b179](https://github.com/astahmer/entity-routes/commit/246b179eef22f0163c0bcbd0246a0d5a50bb67c1))
-   **test/PaginationFilter:** typo ([1f38c46](https://github.com/astahmer/entity-routes/commit/1f38c46b43418284f5e135fd46fa59acadbb708c))
-   **tests:** cleaner ([ec49c65](https://github.com/astahmer/entity-routes/commit/ec49c6526fcf31e18a3db77aec69dbd54630d144))
-   **tests/Cleaner:** rename test file properly ([5d60b8c](https://github.com/astahmer/entity-routes/commit/5d60b8c3d3fca7901be2e264853bf4aec4e433c1))
-   **types:** make serializer services generic at method level rather than at class level ([43fd3ea](https://github.com/astahmer/entity-routes/commit/43fd3ea1147a003024067a15cc75a42a32484c1a))
-   **types:** RequestContext.values/queryParams ([70e6047](https://github.com/astahmer/entity-routes/commit/70e6047a4255b286977552357ec1c08fe5bd163e))
-   **types:** use own DeepPartial ([143450f](https://github.com/astahmer/entity-routes/commit/143450f61a4a43ef6fea1569666ab9b2a269bf17))
-   **typo:** frsom to from in comments ([f716e60](https://github.com/astahmer/entity-routes/commit/f716e60707e8ca878631b6621208929f184405fd))
-   **validator:** add operation auto group ([40e125a](https://github.com/astahmer/entity-routes/commit/40e125a8c6081a2d2599e7e35ff86566316fdb62))
-   **validator:** catch root & validator errors ([b4aed7e](https://github.com/astahmer/entity-routes/commit/b4aed7e8950e9afd57c7a2878fea17fc70a11597))
-   **validator:** updating relation should skip validation ([2dcd181](https://github.com/astahmer/entity-routes/commit/2dcd18116ccacc7c81fed3bcb454a7d845e90aa2))
-   **webpack:** update scripts ([cb09f4a](https://github.com/astahmer/entity-routes/commit/cb09f4a3b5ad2059ab18e3f8c252bc4629664269))
-   **wheremanager:** getPropertyDefaultWhereStrategy return when prop not found in config ([b9ba376](https://github.com/astahmer/entity-routes/commit/b9ba376a7b9cd235753efad498e362b552ec8df2))
-   **wheremanager:** only format using camelToSnake when 1st letter is lowercase ([14ff8c7](https://github.com/astahmer/entity-routes/commit/14ff8c719131fa67de6127ae4c3623a88a8c2c68))
-   **wheremanager:** typings & tiny fixes ([ae7aa2a](https://github.com/astahmer/entity-routes/commit/ae7aa2a4bae298365a3d51fac7aa90b15155c9d8))
-   **wording:** typo ([bad42db](https://github.com/astahmer/entity-routes/commit/bad42db264ba14356ac0fbee99b7a40a11874b3a))
-   readbility using optional chaining ([96e9559](https://github.com/astahmer/entity-routes/commit/96e9559b60047ad7e3a32f7708889b4914a000b4))
-   **wheremanager:** getPropertyDefaultWhereStrategy missing parenthesis on condition ([f067b74](https://github.com/astahmer/entity-routes/commit/f067b7443e453894c60e55654a0eb004da37c58c))

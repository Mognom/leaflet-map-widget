/* globals MashupPlatform, MockMP */

(function () {

    "use strict";

    describe("LeafletMap", function () {

        beforeAll(function () {
            window.MashupPlatform = new MockMP({
                type: 'widget'
            });
        });

        beforeEach(function () {
            MashupPlatform.reset();
        });

        it("Dummy test", function () {
            expect(true).toBeTruthy();
        });

    });

})();

/**
 * *******************************
 * |docname| - SelectOne Component
 * *******************************
 */
import {
    renderRunestoneComponent,
    createTimedComponent,
} from "../../common/js/renderComponent";
import RunestoneBase from "../../common/js/runestonebase";

export default class SelectOne extends RunestoneBase {
    /**
     * constructor --
     * Making an instance of a selectone is a bit more complicated because it is
     * a kind of meta directive.  That is, go to the server and randomly select
     * a question to display in this spot.  Or, if a student has already seen this question
     * in the context of an exam retrieve the question they saw in the first place.
     * Making an API call and waiting for the response is handled asynchronously.
     * But lots of code is not written with that assumption.  So we do the initialization in
     * two parts.
     * 1. Create the object with the usual constructor
     * 2. call initialize, which returns a promise.  When that promise is resolved
     * the "replacement" component will replace the original selectone component in the DOM.
     *
     * @param  {} opts
     */
    constructor(opts) {
        super(opts);
        this.origOpts = opts;
        this.questions = $(opts.orig).data("questionlist");
        this.selector_id = $(opts.orig).first().attr("id");
        opts.orig.id = this.selector_id;
    }
    /**
     * initialize --
     * initialize is used so that the constructor does not have to be async.
     * Constructors should definitely not return promises that would seriously
     * mess things up.
     * @return {Promise} Will resolve after component from DB is reified
     */
    initialize() {
        let self = this;
        let data = { questions: this.questions, selector_id: this.selector_id };
        let opts = this.origOpts;
        let selectorId = this.selector_id;
        let myPromise = new Promise(
            function (resolve, reject) {
                $.getJSON(
                    "/runestone/ajax/get_question_source",
                    data,
                    function (htmlsrc) {
                        let res;
                        if (opts.timed) {
                            // timed components are not rendered immediately, only when the student
                            // starts the assessment and visits this particular entry.
                            res = createTimedComponent(htmlsrc, {
                                timed: true,
                                selector_id: selectorId,
                            });
                            // replace the entry in the timed assessment's list of components
                            // with the component created by createTimedComponent
                            for (let component of opts.rqa) {
                                if (component.question == self) {
                                    component.question = res.question;
                                    component.wrapper = res.wrapper;
                                    break;
                                }
                            }
                            self.realComponent = res.question;
                            self.wrapper = res.wrapper;
                            self.containerDiv = res.question.containerDiv;
                            self.realComponent.selectorId = selectorId;
                        } else {
                            // just render this component on the page in its usual place
                            res = renderRunestoneComponent(
                                htmlsrc,
                                selectorId,
                                {
                                    selector_id: selectorId,
                                }
                            );
                        }
                        resolve("done");
                    }
                );
            }.bind(this)
        );
        return myPromise;
    }
}

/*
 * When the page is loaded and the login checks are complete find and render
 * each selectquestion component that is not part of a timedAssessment.
 **/
$(document).bind("runestone:login-complete", function () {
    $("[data-component=selectquestion]").each(function (index) {
        try {
            if (
                $(this).closest("[data-component=timedAssessment]").length == 0
            ) {
                // If this element exists within a timed component, don't render it here
                let tmp = new SelectOne({ orig: this });
                tmp.initialize();
            }
        } catch (err) {
            console.log(`Error rendering New Exercise ${this.id}
                         Details: ${err}`);
            console.log(err.stack);
        }
    });
});

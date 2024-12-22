import {CustomBlock} from "./customBlock";
import {CustomTopLocator, CustomBottomLocator, CustomLeftLocator, CustomRightLocator} from "./customLocator";
import {CustomHybridPort, CustomInputPort, CustomOutputPort} from "./customPort";

declare global {
    interface Window {
        customDefinitions: {
            CustomBlock: typeof CustomBlock;
            customLocators: {
                CustomTopLocator: typeof CustomTopLocator;
                CustomBottomLocator: typeof CustomBottomLocator;
                CustomLeftLocator: typeof CustomLeftLocator;
                CustomRightLocator: typeof CustomRightLocator;
            },
            customPorts: {
                CustomInputPort: typeof CustomInputPort;
                CustomOutputPort: typeof CustomOutputPort;
                CustomHybridPort: typeof CustomHybridPort;
            }
        };
    }
}
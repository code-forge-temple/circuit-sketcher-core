import {CustomBlock} from "./customBlock";
import {CustomConnection} from "./customConnection";
import {CustomTopLocator, CustomBottomLocator, CustomLeftLocator, CustomRightLocator, CustomPortLabelLocator} from "./customLocator";
import {CustomHybridPort, CustomInputPort, CustomOutputPort} from "./customPort";

declare global {
    interface Window {
        customDefinitions: {
            CustomBlock: typeof CustomBlock;
            CustomConnection: typeof CustomConnection;
            customLocators: {
                CustomTopLocator: typeof CustomTopLocator;
                CustomBottomLocator: typeof CustomBottomLocator;
                CustomLeftLocator: typeof CustomLeftLocator;
                CustomRightLocator: typeof CustomRightLocator;
                CustomPortLabelLocator: typeof CustomPortLabelLocator;
            },
            customPorts: {
                CustomInputPort: typeof CustomInputPort;
                CustomOutputPort: typeof CustomOutputPort;
                CustomHybridPort: typeof CustomHybridPort;
            }
        };
    }
}
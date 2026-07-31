import { createFormHook } from "@tanstack/react-form";
import { FormErrors } from "./components/form-errors";
import { SubmitButton } from "./components/submit-button";
import { fieldContext, formContext } from "./contexts";
import { FormCheckbox } from "./fields/checkbox";
import { FormCombobox } from "./fields/combobox";
import { FormInput } from "./fields/input";
import { FormNumber } from "./fields/number";
import { FormRadioGroup } from "./fields/radio-group";
import { FormSelect } from "./fields/select";
import { FormSwitch } from "./fields/switch";
import { FormTextarea } from "./fields/textarea";

export const { useAppForm, withFieldGroup, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		FormInput,
		FormTextarea,
		FormSelect,
		FormCombobox,
		FormNumber,
		FormCheckbox,
		FormRadioGroup,
		FormSwitch,
	},
	formComponents: {
		SubmitButton,
		FormErrors,
	},
});

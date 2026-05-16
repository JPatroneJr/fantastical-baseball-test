# Makerkit Form Components Reference

## Import Pattern

```typescript
import { useAction } from 'next-safe-action/hooks';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { Checkbox } from '@kit/ui/checkbox';
import { Switch } from '@kit/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';
```

## Form Field Pattern

```tsx
<FormField
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        <Trans i18nKey="namespace:fieldLabel" />
      </FormLabel>
      <FormControl>
        <Input
          data-test="field-name-input"
          placeholder="Enter value"
          {...field}
        />
      </FormControl>
      <FormDescription>
        <Trans i18nKey="namespace:fieldDescription" />
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Select Field

```tsx
<FormField
  name="category"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Category</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger data-test="category-select">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Checkbox Field

```tsx
<FormField
  name="acceptTerms"
  render={({ field }) => (
    <FormItem className="flex items-center space-x-2">
      <FormControl>
        <Checkbox
          data-test="accept-terms-checkbox"
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <FormLabel className="!mt-0">
        <Trans i18nKey="namespace:acceptTerms" />
      </FormLabel>
    </FormItem>
  )}
/>
```

## Switch Field

```tsx
<FormField
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between">
      <div>
        <FormLabel>Enable Notifications</FormLabel>
        <FormDescription>Receive email notifications</FormDescription>
      </div>
      <FormControl>
        <Switch
          data-test="notifications-switch"
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

## Textarea Field

```tsx
<FormField
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea
          data-test="description-textarea"
          placeholder="Enter description..."
          rows={4}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Error Alert

```tsx
<Alert variant="destructive">
  <AlertTitle>
    <Trans i18nKey="common.errors.title" />
  </AlertTitle>
  <AlertDescription>
    <Trans i18nKey="common.errors.generic" />
  </AlertDescription>
</Alert>
```

## Submit Button

```tsx
<Button
  type="submit"
  disabled={isPending}
  data-test="submit-button"
>
  <Trans i18nKey={isPending ? 'common.submitting' : 'common.submit'} />
</Button>
```

## Complete Form Template

```tsx
'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { MySchema } from '../_lib/schemas/my.schema';
import { myAction } from '../_lib/server/server-actions';

export function MyForm() {
  const [state, setState] = useState({
    success: false,
    error: false,
  });

  const { execute, isPending } = useAction(myAction, {
    onSuccess: () => {
      setState({ success: true, error: false });
    },
    onError: () => {
      setState({ error: true, success: false });
    },
  });

  const form = useForm({
    resolver: zodResolver(MySchema),
    defaultValues: { name: '' },
  });

  if (state.success) {
    return (
      <Alert variant="success">
        <AlertTitle>
          <Trans i18nKey="common.success" />
        </AlertTitle>
      </Alert>
    );
  }

  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          <Trans i18nKey="common.errors.title" />
        </AlertTitle>
        <AlertDescription>
          <Trans i18nKey="common.errors.generic" />
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data) => {
          execute(data);
        })}
      >
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="namespace:name" />
              </FormLabel>
              <FormControl>
                <Input data-test="name-input" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} data-test="submit-button">
          <Trans i18nKey={isPending ? 'common.submitting' : 'common.submit'} />
        </Button>
      </form>
    </Form>
  );
}
```

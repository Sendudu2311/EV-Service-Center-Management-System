import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactionApi } from "@/services/api";
import { toast } from "react-hot-toast";
import { Loader2, Receipt, CreditCard, Building2 } from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: any) => void;
  invoiceId?: string;
  appointmentId?: string;
  userId?: string;
  amount?: number;
}

interface CashPaymentFormData {
  amount: number;
  denomination: Record<string, number>;
  changeGiven: number;
  notes: string;
  customerNotes: string;
}

interface CardPaymentFormData {
  amount: number;
  cardType: string;
  last4Digits: string;
  authCode: string;
  transactionId: string;
  terminalId: string;
  merchantId: string;
  batchNumber: string;
  notes: string;
  customerNotes: string;
}

interface BankTransferFormData {
  amount: number;
  bankName: string;
  bankCode: string;
  transferRef: string;
  accountNumber: string;
  accountHolder: string;
  transferDate: string;
  verificationMethod: string;
  verificationNotes: string;
  notes: string;
  customerNotes: string;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  appointmentId,
  userId,
  amount = 0,
}) => {
  const [activeTab, setActiveTab] = useState("cash");
  const [loading, setLoading] = useState(false);

  // Cash payment form
  const [cashForm, setCashForm] = useState<CashPaymentFormData>({
    amount,
    denomination: {},
    changeGiven: 0,
    notes: "",
    customerNotes: "",
  });

  // Card payment form
  const [cardForm, setCardForm] = useState<CardPaymentFormData>({
    amount,
    cardType: "visa",
    last4Digits: "",
    authCode: "",
    transactionId: "",
    terminalId: "",
    merchantId: "",
    batchNumber: "",
    notes: "",
    customerNotes: "",
  });

  // Bank transfer form
  const [bankForm, setBankForm] = useState<BankTransferFormData>({
    amount,
    bankName: "",
    bankCode: "",
    transferRef: "",
    accountNumber: "",
    accountHolder: "",
    transferDate: new Date().toISOString().split("T")[0],
    verificationMethod: "bank_statement",
    verificationNotes: "",
    notes: "",
    customerNotes: "",
  });

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User ID is required");
      return;
    }

    setLoading(true);
    try {
      const response = await transactionApi.recordCashPayment({
        userId,
        appointmentId,
        invoiceId,
        amount: cashForm.amount,
        notes: cashForm.notes,
        customerNotes: cashForm.customerNotes,
        cashData: {
          denomination: cashForm.denomination,
          changeGiven: cashForm.changeGiven,
          notes: cashForm.notes,
        },
      });

      if (response.data.success) {
        toast.success("Cash payment recorded successfully");
        onSuccess(response.data.data.transaction);
        onClose();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error recording cash payment"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User ID is required");
      return;
    }

    setLoading(true);
    try {
      const response = await transactionApi.recordCardPayment({
        userId,
        appointmentId,
        invoiceId,
        amount: cardForm.amount,
        notes: cardForm.notes,
        customerNotes: cardForm.customerNotes,
        cardData: {
          cardType: cardForm.cardType,
          last4Digits: cardForm.last4Digits,
          authCode: cardForm.authCode,
          transactionId: cardForm.transactionId,
          terminalId: cardForm.terminalId,
          merchantId: cardForm.merchantId,
          batchNumber: cardForm.batchNumber,
          notes: cardForm.notes,
        },
      });

      if (response.data.success) {
        toast.success("Card payment recorded successfully");
        onSuccess(response.data.data.transaction);
        onClose();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error recording card payment"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User ID is required");
      return;
    }

    setLoading(true);
    try {
      const response = await transactionApi.recordBankTransferPayment({
        userId,
        appointmentId,
        invoiceId,
        amount: bankForm.amount,
        notes: bankForm.notes,
        customerNotes: bankForm.customerNotes,
        bankTransferData: {
          bankName: bankForm.bankName,
          bankCode: bankForm.bankCode,
          transferRef: bankForm.transferRef,
          accountNumber: bankForm.accountNumber,
          accountHolder: bankForm.accountHolder,
          transferDate: bankForm.transferDate,
          verificationMethod: bankForm.verificationMethod,
          verificationNotes: bankForm.verificationNotes,
          notes: bankForm.notes,
        },
      });

      if (response.data.success) {
        toast.success("Bank transfer payment recorded successfully");
        onSuccess(response.data.data.transaction);
        onClose();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Error recording bank transfer payment"
      );
    } finally {
      setLoading(false);
    }
  };

  const denominations = [
    500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000,
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Cash
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Transfer
            </TabsTrigger>
          </TabsList>

          {/* Cash Payment Tab */}
          <TabsContent value="cash">
            <Card>
              <CardHeader>
                <CardTitle>Cash Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCashSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cash-amount">Amount (VND)</Label>
                      <Input
                        id="cash-amount"
                        type="number"
                        value={cashForm.amount}
                        onChange={(e) =>
                          setCashForm({
                            ...cashForm,
                            amount: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cash-change">Change Given (VND)</Label>
                      <Input
                        id="cash-change"
                        type="number"
                        value={cashForm.changeGiven}
                        onChange={(e) =>
                          setCashForm({
                            ...cashForm,
                            changeGiven: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Cash Denomination Breakdown</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {denominations.map((denom) => (
                        <div key={denom} className="flex items-center gap-2">
                          <Label className="text-sm">
                            {denom.toLocaleString()} VND
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={cashForm.denomination[denom] || 0}
                            onChange={(e) =>
                              setCashForm({
                                ...cashForm,
                                denomination: {
                                  ...cashForm.denomination,
                                  [denom]: Number(e.target.value),
                                },
                              })
                            }
                            className="w-20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cash-notes">Internal Notes</Label>
                    <Textarea
                      id="cash-notes"
                      value={cashForm.notes}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, notes: e.target.value })
                      }
                      placeholder="Internal notes about the payment..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="cash-customer-notes">Customer Notes</Label>
                    <Textarea
                      id="cash-customer-notes"
                      value={cashForm.customerNotes}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          customerNotes: e.target.value,
                        })
                      }
                      placeholder="Customer notes or comments..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Record Cash Payment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Card Payment Tab */}
          <TabsContent value="card">
            <Card>
              <CardHeader>
                <CardTitle>Card Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCardSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="card-amount">Amount (VND)</Label>
                      <Input
                        id="card-amount"
                        type="number"
                        value={cardForm.amount}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            amount: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-type">Card Type</Label>
                      <Select
                        value={cardForm.cardType}
                        onValueChange={(value) =>
                          setCardForm({ ...cardForm, cardType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="mastercard">Mastercard</SelectItem>
                          <SelectItem value="amex">American Express</SelectItem>
                          <SelectItem value="jcb">JCB</SelectItem>
                          <SelectItem value="unionpay">UnionPay</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="card-last4">Last 4 Digits</Label>
                      <Input
                        id="card-last4"
                        value={cardForm.last4Digits}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            last4Digits: e.target.value,
                          })
                        }
                        maxLength={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-auth">Authorization Code</Label>
                      <Input
                        id="card-auth"
                        value={cardForm.authCode}
                        onChange={(e) =>
                          setCardForm({ ...cardForm, authCode: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="card-transaction">Transaction ID</Label>
                      <Input
                        id="card-transaction"
                        value={cardForm.transactionId}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            transactionId: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-terminal">Terminal ID</Label>
                      <Input
                        id="card-terminal"
                        value={cardForm.terminalId}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            terminalId: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="card-merchant">Merchant ID</Label>
                      <Input
                        id="card-merchant"
                        value={cardForm.merchantId}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            merchantId: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-batch">Batch Number</Label>
                      <Input
                        id="card-batch"
                        value={cardForm.batchNumber}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            batchNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="card-notes">Internal Notes</Label>
                    <Textarea
                      id="card-notes"
                      value={cardForm.notes}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, notes: e.target.value })
                      }
                      placeholder="Internal notes about the payment..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="card-customer-notes">Customer Notes</Label>
                    <Textarea
                      id="card-customer-notes"
                      value={cardForm.customerNotes}
                      onChange={(e) =>
                        setCardForm({
                          ...cardForm,
                          customerNotes: e.target.value,
                        })
                      }
                      placeholder="Customer notes or comments..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Record Card Payment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Transfer Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Transfer Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBankSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank-amount">Amount (VND)</Label>
                      <Input
                        id="bank-amount"
                        type="number"
                        value={bankForm.amount}
                        onChange={(e) =>
                          setBankForm({
                            ...bankForm,
                            amount: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank-name">Bank Name</Label>
                      <Input
                        id="bank-name"
                        value={bankForm.bankName}
                        onChange={(e) =>
                          setBankForm({ ...bankForm, bankName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank-code">Bank Code</Label>
                      <Input
                        id="bank-code"
                        value={bankForm.bankCode}
                        onChange={(e) =>
                          setBankForm({ ...bankForm, bankCode: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank-ref">Transfer Reference</Label>
                      <Input
                        id="bank-ref"
                        value={bankForm.transferRef}
                        onChange={(e) =>
                          setBankForm({
                            ...bankForm,
                            transferRef: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank-account">Account Number</Label>
                      <Input
                        id="bank-account"
                        value={bankForm.accountNumber}
                        onChange={(e) =>
                          setBankForm({
                            ...bankForm,
                            accountNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank-holder">Account Holder</Label>
                      <Input
                        id="bank-holder"
                        value={bankForm.accountHolder}
                        onChange={(e) =>
                          setBankForm({
                            ...bankForm,
                            accountHolder: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank-date">Transfer Date</Label>
                      <Input
                        id="bank-date"
                        type="date"
                        value={bankForm.transferDate}
                        onChange={(e) =>
                          setBankForm({
                            ...bankForm,
                            transferDate: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="bank-verification">
                        Verification Method
                      </Label>
                      <Select
                        value={bankForm.verificationMethod}
                        onValueChange={(value) =>
                          setBankForm({
                            ...bankForm,
                            verificationMethod: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_statement">
                            Bank Statement
                          </SelectItem>
                          <SelectItem value="sms_confirmation">
                            SMS Confirmation
                          </SelectItem>
                          <SelectItem value="online_banking">
                            Online Banking
                          </SelectItem>
                          <SelectItem value="phone_verification">
                            Phone Verification
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bank-verification-notes">
                      Verification Notes
                    </Label>
                    <Textarea
                      id="bank-verification-notes"
                      value={bankForm.verificationNotes}
                      onChange={(e) =>
                        setBankForm({
                          ...bankForm,
                          verificationNotes: e.target.value,
                        })
                      }
                      placeholder="Notes about the verification process..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank-notes">Internal Notes</Label>
                    <Textarea
                      id="bank-notes"
                      value={bankForm.notes}
                      onChange={(e) =>
                        setBankForm({ ...bankForm, notes: e.target.value })
                      }
                      placeholder="Internal notes about the payment..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank-customer-notes">Customer Notes</Label>
                    <Textarea
                      id="bank-customer-notes"
                      value={bankForm.customerNotes}
                      onChange={(e) =>
                        setBankForm({
                          ...bankForm,
                          customerNotes: e.target.value,
                        })
                      }
                      placeholder="Customer notes or comments..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Record Bank Transfer
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentModal;

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import ValidationError
from main.models import BankAccount

class BankingView(APIView):
    permission_classes = [IsAuthenticated]

    action_handler = {
        "get_bank_accounts": "_get_bank_accounts",
        "create_bank_account": "_create_bank_account",
        'delete_bank_account': '_delete_bank_account',
        'set_default_bank_account': '_set_default_bank_account',
    }

    def get(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def post(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def delete(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)   
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def patch(self, request, *args, **kwargs):
        action = kwargs.get('action')
        if action not in self.action_handler:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        handler = getattr(self, self.action_handler[action])
        return handler(request)
    
    def _get_bank_accounts(self, request):
        """ Get all bank accounts related to the user.
        Args:
            request: The request object
        Returns:
            list: The list of bank accounts

        """
        try:
            """ TODO: Only get bank accounts that are verified """
            bank_accounts = BankAccount.objects.filter(detailer=request.user.detailer)
            bank_account_data = []
            # Loop through the bank accounts and add the data to the list
            for bank_account in bank_accounts:
                bank_account_data.append({
                    'id': bank_account.id,
                    'account_number': bank_account.account_number,
                    'account_name': bank_account.account_name,
                    'bank_name': bank_account.bank_name,
                    'iban': bank_account.iban,
                    'bic': bank_account.bic,
                    'sort_code': bank_account.sort_code,
                    'is_default': bank_account.is_primary,
                })
            # Check if the bank accounts are empty then return an empty list
            if not bank_account_data:
                return Response([], status=status.HTTP_200_OK)
            return Response(bank_account_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    
    def _create_bank_account(self, request):
        """ Create a new bank account for the user.
        Args:
            request: The request object of the user, and the bank account data
        Returns:
            Response: The response object {message: "Bank account created successfully"}
        """

        # before an account is created, check how many accounts are already in the db
        # if the user has more than 2 bank accounts, return message letting them know that they can not
        # create more than 2 bank accounts
        try:
            if BankAccount.objects.filter(detailer=request.user.detailer, is_verified=True).count() >= 2:
                    return Response({"error": "You can not add more than 2 bank accounts"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            bank_account_data = request.data.get('bankAccountData')
            bank_account = BankAccount.objects.create(
                detailer=request.user.detailer,
                account_number=bank_account_data.get('account_number'),
                account_name=bank_account_data.get('account_name'),
                bank_name=bank_account_data.get('bank_name'),
                iban=bank_account_data.get('iban'),
                bic=bank_account_data.get('bic'),
                sort_code=bank_account_data.get('sort_code'),
            )
            # Check if this is the first bank account then set it as the primary bank account
            if BankAccount.objects.filter(detailer=request.user.detailer).count() == 1:
                bank_account.is_primary = True
                bank_account.save()
            return Response({"message": f'{bank_account.account_number} created successfully'}, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    """ Delete a bank account from the db
    Args:
        request: The request object of the user, and the bank account id
    Returns:
        Response: The response object {message: "Bank account deleted successfully"}
    """
    def _delete_bank_account(self, request):
        try:
            account_id = request.data.get('account_id')
            try:
                bank_account = BankAccount.objects.get(id=account_id, detailer=request.user.detailer)
            except BankAccount.DoesNotExist:

                # Check if the bank account is the primary bank account
                # Return a message that the bank account is the primary bank account and cannot be deleted
                if bank_account.is_primary:
                    return Response({"error": "Primary bank account cannot be deleted, please set another bank account as the primary bank account first"}, status=status.HTTP_400_BAD_REQUEST)
                bank_account.delete()
                return Response({"message": f"{bank_account.account_number} deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
    """ Set the primary bank account of the user to
    Args:
        request: The request object of the user, and the bank account id
    Returns:
        Response: The response object {message: "Bank account set as primary successfully"} 
    """
    def _set_default_bank_account(self, request):
        try:
            account_id = request.data.get('account_id')
            # check if the account if valid and on the db
            try:
                bank_account = BankAccount.objects.get(id=account_id, detailer=request.user.detailer)
            except BankAccount.DoesNotExist:
                return Response({"error": "Bank account not found"}, status=status.HTTP_404_NOT_FOUND)
            
            bank_account.is_primary = True
            bank_account.save()
            return Response({"message": f"{bank_account.account_number} set as primary successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)